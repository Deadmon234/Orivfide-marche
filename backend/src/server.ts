import { app } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db.js";

const server = app.listen(config.PORT, "0.0.0.0", () => {
  console.warn(`ORIVFIDE API listening on port ${config.PORT}`);
});

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.warn(`Received ${signal}; shutting down gracefully.`);
  const forcedExit = setTimeout(() => {
    console.error("Graceful shutdown timed out.");
    process.exit(1);
  }, 10_000);
  forcedExit.unref();
  server.close(async (error) => {
    if (error) console.error("HTTP server shutdown error", error);
    try {
      await pool.end();
      process.exit(error ? 1 : 0);
    } catch (poolError) {
      console.error("PostgreSQL pool shutdown error", poolError);
      process.exit(1);
    }
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
