import nextEnv from '@next/env';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
nextEnv.loadEnvConfig(process.cwd());
const payload = JSON.parse(await readFile('.local/customer-import.json', 'utf8'));
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
let client;
try {
  const codes = new Set();
  for (const row of payload.rows) {
    const v = row.values;
    if (!v['หมายเลขลูกค้า'] || !v['ชื่อลูกค้า'] || codes.has(v['หมายเลขลูกค้า'])) throw new Error('Invalid or duplicate customer code');
    if (!['เปิดใช้งาน','ปิดใช้งาน'].includes(v['สถานะ'])) throw new Error('Unknown customer status');
    if (v['เครดิต'] != null && (!Number.isInteger(Number(v['เครดิต'])) || Number(v['เครดิต']) < 0)) throw new Error('Invalid credit days');
    codes.add(v['หมายเลขลูกค้า']);
  }
  client = await pool.connect();
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(74290002)');
  const existing = await client.query('SELECT id FROM import_batches WHERE file_sha256=$1', [payload.sha256]);
  if (existing.rows.length) {
    console.log('This source workbook has already been imported. No records changed.');
  } else {
    const batch = await client.query(`INSERT INTO import_batches(filename,file_sha256,status,imported_count)
      VALUES($1,$2,'completed',$3) RETURNING id`, [payload.filename,payload.sha256,payload.rows.length]);
    for (const row of payload.rows) {
      const v = row.values;
      // Conflicting existing codes abort the whole batch instead of overwriting user edits.
      const r = await client.query(`INSERT INTO customers(customer_code,legal_name,tax_id,branch_name,address,
        contact_name,contact_phone,contact_email,credit_days,billing_schedule,payment_schedule,notes,is_active)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`, [
        String(v['หมายเลขลูกค้า']),v['ชื่อลูกค้า'],v['เลขประจำตัวผู้เสียภาษี'] == null ? null : String(v['เลขประจำตัวผู้เสียภาษี']),
        v['สาขา'] ?? '',v['ที่อยู่'] ?? '',v['ชื่อผู้ติดต่อ'] ?? '',String(v['เบอร์โทรผู้ติดต่อ'] ?? ''),v['อีเมลผู้ติดต่อ'] ?? '',
        v['เครดิต'] == null ? null : Number(v['เครดิต']),String(v['วันที่รับวางบิล'] ?? ''),String(v['วันที่รับเงิน'] ?? ''),v['โน้ต'] ?? '',v['สถานะ']==='เปิดใช้งาน',
      ]);
      await client.query('INSERT INTO import_rows(batch_id,sheet_name,row_number,raw_data,customer_id) VALUES($1,$2,$3,$4,$5)', [batch.rows[0].id,payload.sheet,row.row,JSON.stringify(v),r.rows[0].id]);
    }
    console.log(`Imported ${payload.rows.length} customers with source row provenance.`);
  }
  await client.query('COMMIT');
} catch (error) {
  if (client) await client.query('ROLLBACK');
  console.error('Customer import aborted; no partial changes:', error.code ?? error.message);
  process.exitCode=1;
} finally {
  client?.release();
  await pool.end();
}
