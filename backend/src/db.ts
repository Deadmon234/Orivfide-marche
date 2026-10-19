import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { config } from "./config.js";

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: config.DATABASE_POOL_MAX,
  ssl: config.databaseSsl ? { rejectUnauthorized: true } : false,
  application_name: "orivfide-backend",
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error", error.name);
});

export async function inTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
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

export async function queryOne<T extends QueryResultRow>(
  sql: string,
  values: readonly unknown[],
): Promise<T | null> {
  const result = await pool.query<T>(sql, [...values]);
  return result.rows[0] ?? null;
}
