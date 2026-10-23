import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url().refine(
    (value) => ["postgres:", "postgresql:"].includes(new URL(value).protocol),
    "DATABASE_URL must use the postgres or postgresql protocol",
  ),
  DATABASE_SSL: z.enum(["true", "false"]).default("true"),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must contain at least 32 characters"),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, "JWT_EXPIRES_IN must look like 15m or 7d").default("7d"),
  ADMIN_API_KEY: z.string().min(32, "ADMIN_API_KEY must contain at least 32 characters").optional(),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1).optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1).optional(),
  WHATSAPP_TEMPLATE_NAME: z.string().min(1).optional(),
  WHATSAPP_TEMPLATE_LANGUAGE: z.string().min(2).optional(),
  WHATSAPP_GRAPH_API_VERSION: z.string().regex(/^v\d+\.\d+$/).optional(),
}).superRefine((values, context) => {
  const whatsappValues = [
    values.WHATSAPP_ACCESS_TOKEN,
    values.WHATSAPP_PHONE_NUMBER_ID,
    values.WHATSAPP_TEMPLATE_NAME,
    values.WHATSAPP_TEMPLATE_LANGUAGE,
    values.WHATSAPP_GRAPH_API_VERSION,
  ];
  if (whatsappValues.some(Boolean) && whatsappValues.some((value) => !value)) {
    context.addIssue({
      code: "custom",
      message: "Configure every WHATSAPP_* variable together to enable customer phone verification.",
    });
  }
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const messages = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  throw new Error(`Invalid backend environment:\n${messages.join("\n")}`);
}

const origins = parsed.data.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
if (origins.includes("*")) {
  throw new Error("CORS_ORIGINS cannot contain a wildcard origin.");
}

const whatsapp = parsed.data.WHATSAPP_ACCESS_TOKEN
  && parsed.data.WHATSAPP_PHONE_NUMBER_ID
  && parsed.data.WHATSAPP_TEMPLATE_NAME
  && parsed.data.WHATSAPP_TEMPLATE_LANGUAGE
  && parsed.data.WHATSAPP_GRAPH_API_VERSION
  ? {
      accessToken: parsed.data.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: parsed.data.WHATSAPP_PHONE_NUMBER_ID,
      templateName: parsed.data.WHATSAPP_TEMPLATE_NAME,
      templateLanguage: parsed.data.WHATSAPP_TEMPLATE_LANGUAGE,
      graphApiVersion: parsed.data.WHATSAPP_GRAPH_API_VERSION,
    }
  : null;

export const config = {
  ...parsed.data,
  corsOrigins: new Set(origins),
  databaseSsl: parsed.data.DATABASE_SSL === "true",
  whatsapp,
};
