import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";

async function migrate(): Promise<void> {
  const migrationPath = fileURLToPath(new URL("../migrations/001_initial_schema.sql", import.meta.url));
  const sql = await readFile(migrationPath, "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const existing = await client.query(
      "SELECT 1 FROM schema_migrations WHERE filename = $1",
      ["001_initial_schema.sql"],
    );
    if (existing.rowCount === 0) {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", ["001_initial_schema.sql"]);
    }
    await client.query("COMMIT");
    console.warn(existing.rowCount === 0 ? "Database migration applied." : "Database is already up to date.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error: unknown) => {
  console.error("Database migration failed.", error instanceof Error ? error.name : "Unknown error");
  process.exitCode = 1;
});
