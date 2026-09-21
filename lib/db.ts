import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

const globalForDb = globalThis as unknown as { srpPool?: Pool };
export const pool = globalForDb.srpPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  statement_timeout: 15000,
});
if (process.env.NODE_ENV !== "production") globalForDb.srpPool = pool;

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
  return (await pool.query<T>(text, values)).rows;
}

export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
