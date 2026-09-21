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

const REQUIRED_MAPPING = {
  product_code: 'เลขสินค้า',
  status: 'สถานะ',
  source_type: 'ประเภท',
  name: 'ชื่อ',
  description: 'รายละเอียด',
  category: 'หมวดหมู่',
  unit: 'หน่วยนับ',
};
const SOURCE_KIND = {
  TRADING_PRODUCT: 'hardware',
  SERVICE: 'service',
};
const SOURCE_STATUS = {
  ACTIVE: true,
  INACTIVE: false,
  DISABLED: false,
};

function text(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function optionalText(value) {
  return text(value);
}

function rawRow(row) {
  if (!row || typeof row.values !== 'object' || row.values === null) {
    throw new Error(`Invalid payload row at source row ${row?.row ?? '?'}`);
  }
  return row.values;
}

function validatePayload() {
  if (payload.schema_version !== 'products-import-v1') {
    throw new Error('Unsupported products import payload version');
  }
  if (!payload.filename || !payload.sha256 || !payload.sheet) {
    throw new Error('Products import payload is missing source metadata');
  }
  if (JSON.stringify(payload.mapping) !== JSON.stringify(REQUIRED_MAPPING)) {
    throw new Error('Products import mapping does not match the bounded v1 mapping');
  }
  if (!Array.isArray(payload.rows) || payload.rows.length === 0) {
    throw new Error('Products import payload contains no rows');
  }
}

validatePayload();

const supported = [];
const review = [];
const seenCodes = new Set();
for (const row of payload.rows) {
  const values = rawRow(row);
  const code = text(values[REQUIRED_MAPPING.product_code]);
  const name = text(values[REQUIRED_MAPPING.name]);
  const sourceStatus = text(values[REQUIRED_MAPPING.status]);
  const sourceType = text(values[REQUIRED_MAPPING.source_type]);
  const issues = [];

  if (!code) issues.push('missing product code');
  if (!name) issues.push('missing product name');
  if (code && seenCodes.has(code)) issues.push(`duplicate product code ${code}`);
  if (code) seenCodes.add(code);
  if (!(sourceStatus in SOURCE_STATUS)) issues.push(`unsupported status ${sourceStatus || '(empty)'}`);
  if (!(sourceType in SOURCE_KIND)) issues.push(`unsupported source type ${sourceType || '(empty)'}`);

  if (issues.length) {
    review.push({ row, issues });
    continue;
  }

  supported.push({
    row,
    values,
    product: {
      productCode: code,
      model: '',
      vendorPart: '',
      name,
      description: optionalText(values[REQUIRED_MAPPING.description]),
      kind: SOURCE_KIND[sourceType],
      category: optionalText(values[REQUIRED_MAPPING.category]),
      // A blank source unit stays blank; it is unknown, not proof of a piece.
      unit: optionalText(values[REQUIRED_MAPPING.unit]),
      warranty: '',
      isActive: SOURCE_STATUS[sourceStatus],
    },
  });
}

// Duplicate source codes are unsafe even when one of the rows needs review.
const duplicateIssues = review.filter(({ issues }) => issues.some((issue) => issue.startsWith('duplicate product code')));
if (duplicateIssues.length) {
  throw new Error(`Duplicate product codes in source rows: ${duplicateIssues.map(({ row }) => row.row).join(', ')}`);
}

let client;
try {
  client = await pool.connect();
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(74290002)');

  const existingBatch = await client.query(
    'SELECT id, status, imported_count FROM import_batches WHERE file_sha256=$1',
    [payload.sha256],
  );
  if (existingBatch.rows.length) {
    console.log(
      `This source workbook has already been imported (${existingBatch.rows[0].status}, ` +
        `${existingBatch.rows[0].imported_count} products). No records changed.`,
    );
    await client.query('COMMIT');
  } else {
    const codes = supported.map(({ product }) => product.productCode);
    if (codes.length) {
      const conflicts = await client.query(
        'SELECT product_code FROM products WHERE product_code = ANY($1::text[])',
        [codes],
      );
      if (conflicts.rows.length) {
        throw new Error(
          `Existing product code conflict; batch aborted: ${conflicts.rows.map((row) => row.product_code).join(', ')}`,
        );
      }
    }

    const batch = await client.query(
      `INSERT INTO import_batches(filename,file_sha256,status,imported_count,issues)
       VALUES($1,$2,$3,$4,$5) RETURNING id`,
      [
        payload.filename,
        payload.sha256,
        review.length ? 'needs_review' : 'completed',
        supported.length,
        JSON.stringify(review.map(({ row, issues }) => ({ row: row.row, issues }))),
      ],
    );
    const batchId = batch.rows[0].id;

    for (const { row, values, product } of supported) {
      const inserted = await client.query(
        `INSERT INTO products(product_code,model,vendor_part,name,description,kind,category,unit,warranty,is_active)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [
          product.productCode,
          product.model,
          product.vendorPart,
          product.name,
          product.description,
          product.kind,
          product.category,
          product.unit,
          product.warranty,
          product.isActive,
        ],
      );
      await client.query(
        'INSERT INTO import_rows(batch_id,sheet_name,row_number,raw_data) VALUES($1,$2,$3,$4)',
        [batchId, payload.sheet, row.row, JSON.stringify(values)],
      );
      // Keep this query result in the loop to make the product insert failure
      // atomic; import_rows intentionally has no product FK in migration 002.
      void inserted;
    }

    for (const { row } of review) {
      await client.query(
        'INSERT INTO import_rows(batch_id,sheet_name,row_number,raw_data) VALUES($1,$2,$3,$4)',
        [batchId, payload.sheet, row.row, JSON.stringify(row.values)],
      );
    }

    await client.query('COMMIT');
    console.log(
      `Imported ${supported.length} products with source row provenance.` +
        (review.length ? ` ${review.length} rows need review and were not inserted.` : ''),
    );
  }
} catch (error) {
  if (client) await client.query('ROLLBACK');
  console.error('Product import aborted; no partial changes:', error.code ?? error.message);
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
