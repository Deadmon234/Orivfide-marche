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

export const sellerRejectionSchema = z.object({
  reason: z.string().trim().min(5).max(1000),
});

export const updateStoreSchema = z.object({
  name: name("storeName"),
  description: z.string().trim().max(1000),
  category: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(6).max(32),
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
  imageBase64: z.string().max(4_194_304).optional().nullable(),
  imageMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional().nullable(),
}).superRefine((product, context) => {
  const hasImageData = Boolean(product.imageBase64);
  const hasMimeType = Boolean(product.imageMimeType);
  if (hasImageData !== hasMimeType) {
    context.addIssue({
      code: "custom",
      message: "imageBase64 and imageMimeType must be provided together.",
    });
  }
  if (hasImageData && product.imageUrl) {
    context.addIssue({
      code: "custom",
      message: "Provide either an uploaded image or an image URL, not both.",
    });
  }
  if (product.imageBase64) {
    const bytes = Buffer.from(product.imageBase64, "base64");
    if (
      bytes.length === 0
      || bytes.length > 3 * 1024 * 1024
      || bytes.toString("base64") !== product.imageBase64
    ) {
      context.addIssue({
        code: "custom",
        message: "Uploaded image data is invalid or exceeds 3 MB.",
      });
    }
  }
});

export const updateProductSchema = z.object({
  isActive: z.boolean(),
  name: name("name").optional(),
  description: z.string().trim().max(2000).optional(),
  price: z.coerce.number().int().positive().max(2_147_483_647).optional(),
  imageBase64: z.string().max(4_194_304).optional().nullable(),
  imageMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional().nullable(),
}).partial().superRefine((product, context) => {
  const hasImageData = Boolean(product.imageBase64);
  const hasMimeType = Boolean(product.imageMimeType);
  if (hasImageData !== hasMimeType) {
    context.addIssue({
      code: "custom",
      message: "imageBase64 and imageMimeType must be provided together.",
    });
  }
  if (product.imageBase64) {
    const bytes = Buffer.from(product.imageBase64, "base64");
    if (
      bytes.length === 0
      || bytes.length > 3 * 1024 * 1024
      || bytes.toString("base64") !== product.imageBase64
    ) {
      context.addIssue({
        code: "custom",
        message: "Uploaded image data is invalid or exceeds 3 MB.",
      });
    }
  }
  if (
    product.isActive === undefined
    && product.name === undefined
    && product.description === undefined
    && product.price === undefined
    && product.imageBase64 === undefined
  ) {
    context.addIssue({ code: "custom", message: "Provide at least one product field to update." });
  }
});
