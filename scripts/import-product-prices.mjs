import nextEnv from '@next/env';
import pg from 'pg';
import { readFile } from 'node:fs/promises';

nextEnv.loadEnvConfig(process.cwd());

const payloadPath = process.argv[2] ?? '.local/products-import.json';
const payload = JSON.parse(await readFile(payloadPath, 'utf8'));
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});

const PRODUCT_CODE = 'เลขสินค้า';
const SELLING_PRICE = 'ราคาขาย';
const COST_PRICE = 'ต้นทุนเฉลี่ย';
const SOURCE_TYPES = new Set(['TRADING_PRODUCT', 'SERVICE']);
const SOURCE_HASH = `${payload.sha256}:product-prices-v1`;
const PRICE_LIST_CODE = `PL-EXCEL-${payload.sha256.slice(0, 10).toUpperCase()}`;

function text(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function money(value) {
  if (value === null || value === undefined || text(value) === '') return null;
  const normalized = text(value).replace(/,/g, '');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed >= 1e12) return null;
  return parsed;
}

if (payload.schema_version !== 'products-import-v1' || !payload.sha256 || !Array.isArray(payload.rows)) {
  throw new Error('Unsupported or incomplete products import payload');
}

const rows = [];
const issues = [];
const seenCodes = new Set();
for (const row of payload.rows) {
  const values = row?.values;
  const code = text(values?.[PRODUCT_CODE]);
  const sourceType = text(values?.['ประเภท']);
  const selling = money(values?.[SELLING_PRICE]);
  const cost = money(values?.[COST_PRICE]);
  const rowIssues = [];

  if (!code) rowIssues.push('missing product code');
  if (code && seenCodes.has(code)) rowIssues.push(`duplicate product code ${code}`);
  if (code) seenCodes.add(code);
  if (!SOURCE_TYPES.has(sourceType)) rowIssues.push(`unsupported source type ${sourceType || '(empty)'}`);
  if (selling === null || selling <= 0) rowIssues.push('selling price is blank, invalid, zero, or negative');
  if (values?.[COST_PRICE] !== null && values?.[COST_PRICE] !== undefined && text(values?.[COST_PRICE]) !== '' && cost === null) {
    rowIssues.push('average cost is invalid or negative');
  }

  if (rowIssues.length) {
    issues.push({ row: row.row, code, issues: rowIssues });
    continue;
  }
  rows.push({ sourceRow: row.row, code, selling, cost, values });
}

const duplicates = issues.filter(({ issues: rowIssues }) => rowIssues.some((issue) => issue.startsWith('duplicate product code')));
if (duplicates.length) {
  throw new Error(`Duplicate product codes in source rows: ${duplicates.map(({ row }) => row).join(', ')}`);
}

let client;
try {
  client = await pool.connect();
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(74290003)');

  const existing = await client.query(
    `SELECT id, status, (SELECT count(*)::int FROM price_list_items WHERE price_list_id = price_lists.id) AS item_count
       FROM price_lists WHERE code = $1`,
    [PRICE_LIST_CODE],
  );
  if (existing.rows.length) {
    console.log(`Product price list ${PRICE_LIST_CODE} already exists (${existing.rows[0].item_count} items); no records changed.`);
    await client.query('COMMIT');
  } else {
    const codes = rows.map((row) => row.code);
    const products = await client.query(
      'SELECT id, product_code FROM products WHERE product_code = ANY($1::text[])',
      [codes],
    );
    const productIds = new Map(products.rows.map((row) => [row.product_code, row.id]));
    const missingProducts = rows.filter((row) => !productIds.has(row.code));
    for (const row of missingProducts) {
      issues.push({ row: row.sourceRow, code: row.code, issues: ['product code was not found in products table'] });
    }
    const importable = rows.filter((row) => productIds.has(row.code));

    const batch = await client.query(
      `INSERT INTO import_batches(filename,file_sha256,status,imported_count,issues)
       VALUES($1,$2,$3,$4,$5) RETURNING id`,
      [
        `${payload.filename} (product prices)`,
        SOURCE_HASH,
        issues.length ? 'needs_review' : 'completed',
        importable.length,
        JSON.stringify(issues),
      ],
    );
    const batchId = batch.rows[0].id;

    const list = await client.query(
      `INSERT INTO price_lists(code,name,version,valid_from,status,currency)
       VALUES($1,$2,1,CURRENT_DATE,'published','THB') RETURNING id`,
      [PRICE_LIST_CODE, `ราคาสินค้าจาก ${payload.filename}`],
    );
    const priceListId = list.rows[0].id;

    for (const row of importable) {
      await client.query(
        `INSERT INTO price_list_items(price_list_id,product_id,selling_price,tax_basis,vat_rate,cost_price)
         VALUES($1,$2,$3,'exclusive',7,$4)`,
        [priceListId, productIds.get(row.code), row.selling, row.cost],
      );
      await client.query(
        `INSERT INTO import_rows(batch_id,sheet_name,row_number,raw_data)
         VALUES($1,$2,$3,$4)`,
        [batchId, payload.sheet, row.sourceRow, JSON.stringify(row.values)],
      );
    }

    for (const row of issues) {
      const source = payload.rows.find((candidate) => candidate.row === row.row);
      if (source) {
        await client.query(
          `INSERT INTO import_rows(batch_id,sheet_name,row_number,raw_data)
           VALUES($1,$2,$3,$4) ON CONFLICT (batch_id,sheet_name,row_number) DO NOTHING`,
          [batchId, payload.sheet, source.row, JSON.stringify(source.values)],
        );
      }
    }

    await client.query('COMMIT');
    console.log(`Imported ${importable.length} product prices into ${PRICE_LIST_CODE}. ${issues.length} rows need review.`);
  }
} catch (error) {
  if (client) await client.query('ROLLBACK');
  console.error('Product price import aborted; no partial changes:', error.code ?? error.message);
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
