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

export const customerRegisterSchema = z.object({
  fullName: name("fullName"),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(10).refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "password must be at most 72 UTF-8 bytes.",
  ),
});

export const cartItemSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(1_000_000),
});

export const cartQuantitySchema = z.object({
  quantity: z.number().int().min(1).max(1_000_000),
});

export const checkoutPreviewSchema = z.object({}).strict();

export const checkoutConfirmSchema = z.object({
  idempotencyKey: z.string().uuid(),
  delivery: z.object({
    fullName: name("delivery fullName"),
    phone: z.string().trim().min(6).max(32),
    addressLine1: z.string().trim().min(5).max(250),
    addressLine2: z.string().trim().max(250).optional().default(""),
    city: z.string().trim().min(2).max(120),
    region: z.string().trim().min(2).max(120),
    country: z.literal("CM"),
  }).strict(),
}).strict();

export const mtnPaymentInitiateSchema = z.object({
  orderId: z.string().uuid(),
  payerPhone: z.string().trim().regex(/^237[0-9]{9}$/, "Le numéro MTN doit commencer par 237 et contenir 12 chiffres."),
  idempotencyKey: z.string().uuid(),
}).strict();

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

export const inventoryMovementSchema = z.object({
  quantityDelta: z.number().int().min(-1_000_000).max(1_000_000).refine((value) => value !== 0),
  reason: z.string().trim().min(3).max(500),
  idempotencyKey: z.string().uuid(),
});

export const inventoryThresholdSchema = z.object({
  lowStockThreshold: z.number().int().min(0).max(1_000_000),
  reason: z.string().trim().min(3).max(500),
  idempotencyKey: z.string().uuid(),
});

export const sellerOrderStatusSchema = z.object({
  status: z.enum(["confirmed", "preparing", "handed_to_carrier", "in_transit", "delivered", "cancelled", "delivery_failed", "returned", "disputed"]),
  reason: z.string().trim().min(3).max(500),
}).strict();

export const createVariantSchema = z.object({
  label: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(1).max(80).optional().nullable(),
  attributes: z.record(z.string(), z.string().trim().min(1).max(80)).default({}),
}).superRefine((variant, context) => {
  if (Object.keys(variant.attributes).length > 20) {
    context.addIssue({ code: "custom", message: "A variant can have at most 20 attributes." });
  }
});

export const updateVariantSchema = z.object({
  isActive: z.literal(false),
});

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(50),
  cursor: z.string().uuid().optional(),
});
