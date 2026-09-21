import nextEnv from '@next/env';
import pg from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

nextEnv.loadEnvConfig(process.cwd());
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
const command = process.argv[2] ?? 'check';
try {
  if (command === 'check') {
    const { rows } = await pool.query(`SELECT current_database() AS database, current_user AS username,
      current_setting('server_version') AS version,
      (SELECT extversion FROM pg_extension WHERE extname='vector') AS vector_version`);
    console.log(JSON.stringify(rows[0], null, 2));
  } else if (command === 'migrate') {
    const client = await pool.connect();
    try {
      await client.query("SELECT pg_advisory_lock(74290001)");
      await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
      for (const file of (await readdir('migrations')).filter(f => f.endsWith('.sql')).sort()) {
        const sql = await readFile(`migrations/${file}`, 'utf8');
        const hash = createHash('sha256').update(sql).digest('hex');
        const applied = await client.query('SELECT checksum FROM schema_migrations WHERE name=$1', [file]);
        if (applied.rows.length) {
          if (applied.rows[0].checksum !== hash) throw new Error(`Migration changed after applying: ${file}`);
          continue;
        }
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [file,hash]);
          await client.query('COMMIT');
          console.log(`Applied ${file}`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
    } finally {
      await client.query('SELECT pg_advisory_unlock(74290001)');
      client.release();
    }
  } else throw new Error('Use check or migrate');
} catch (error) {
  console.error('Database operation failed:', error.code ?? error.message?.replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]'));
  process.exitCode = 1;
} finally {
  await pool.end();
}
