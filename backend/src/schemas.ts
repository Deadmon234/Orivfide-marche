import { z } from "zod";

const name = (label: string) => z.string().trim().min(2, `${label} must be at least 2 characters.`).max(120);

export const registerSchema = z.object({
  fullName: name("fullName"),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(10).refine((value) => Buffer.byteLength(value, "utf8") <= 72, "password must be at most 72 UTF-8 bytes."),
  storeName: name("storeName"),
  category: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(6).max(32),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).refine((value) => Buffer.byteLength(value, "utf8") <= 72, "password must be at most 72 UTF-8 bytes."),
});

export const draftAcknowledgementSchema = z.object({
  signerName: name("signerName"),
  acknowledge: z.literal(true),
});

const imageUrl = z.string().trim().max(2048).optional().nullable().transform((value, context) => {
  if (value === undefined || value === null || value === "") return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) {
      context.addIssue({ code: "custom", message: "imageUrl must be a valid HTTPS URL." });
      return z.NEVER;
    }
    return parsed.toString();
  } catch {
    context.addIssue({ code: "custom", message: "imageUrl must be a valid HTTPS URL." });
    return z.NEVER;
  }
});

export const createProductSchema = z.object({
  name: name("name"),
  description: z.string().trim().max(2000).default(""),
  price: z.coerce.number().int().positive().max(2_147_483_647),
  imageUrl,
});

export const updateProductSchema = z.object({
  isActive: z.boolean(),
});
