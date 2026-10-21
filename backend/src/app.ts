import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.js";
import { pool } from "./db.js";
import { HttpError } from "./errors.js";
import routes from "./routes.js";

export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", config.NODE_ENV === "production" ? 1 : false);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.has(origin)) return callback(null, true);
    return callback(new HttpError(403, "This origin is not allowed by CORS."));
  },
  methods: ["GET", "POST", "PATCH", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
  maxAge: 600,
}));
app.use(express.json({ limit: "5mb", strict: true }));

app.get("/health", (_request, response, next) => {
  pool.query("SELECT 1")
    .then(() => response.json({ status: "ok" }))
    .catch(next);
});
app.use("/api", routes);
app.use((_request, response) => {
  response.status(404).json({ error: "Not found." });
});

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (response.headersSent) return;
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: error.message, message: error.message });
    return;
  }
  if (error instanceof SyntaxError && "body" in error) {
    response.status(400).json({ error: "Invalid JSON request body." });
    return;
  }
  if (typeof error === "object" && error !== null && "type" in error && error.type === "entity.too.large") {
    response.status(413).json({ error: "Request body is too large." });
    return;
  }
  console.error("Unhandled API error", error instanceof Error ? error.name : "Unknown error");
  response.status(500).json({ error: "Internal server error." });
};
app.use(errorHandler);
