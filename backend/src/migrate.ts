import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";

async function migrate(): Promise<void> {
  const migrationsUrl = new URL("../migrations/", import.meta.url);
  const migrationsDirectory = fileURLToPath(migrationsUrl);
  const migrations = (await readdir(migrationsDirectory))
    .filter((filename) => /^\d+_[a-z0-9_-]+\.sql$/i.test(filename))
    .sort();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    let appliedCount = 0;
    for (const filename of migrations) {
      const existing = await client.query(
        "SELECT 1 FROM schema_migrations WHERE filename = $1",
        [filename],
      );
      if (existing.rowCount !== 0) continue;
      const sql = await readFile(fileURLToPath(new URL(filename, migrationsUrl)), "utf8");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
      appliedCount += 1;
    }
    await client.query("COMMIT");
    console.warn(appliedCount > 0
      ? `${appliedCount} database migration(s) applied.`
      : "Database is already up to date.");
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
