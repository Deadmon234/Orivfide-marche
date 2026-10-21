import { Router, type Request, type Response, type NextFunction } from "express";
import { randomUUID, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { createAccessToken, requireSeller } from "./auth.js";
import { config } from "./config.js";
import { inTransaction, pool, queryOne } from "./db.js";
import { HttpError } from "./errors.js";
import {
  createProductSchema,
  loginSchema,
  registerSchema,
  sellerRejectionSchema,
  updateProductSchema,
} from "./schemas.js";

type SellerRow = {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  status: "pending_review" | "active" | "rejected";
  rejection_reason: string | null;
  created_at: Date;
};

type StoreRow = {
  id: string;
  seller_id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  phone: string;
  is_public: boolean;
  created_at: Date;
};

type ProductRow = {
  id: string;
  store_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
  created_at: Date;
};

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Try again later." },
});
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many administrator authentication attempts. Try again later." },
});

function requireAdmin(request: Request, _response: Response, next: NextFunction) {
  const expected = config.ADMIN_API_KEY;
  const provided = request.header("x-admin-key");
  if (!expected) {
    next(new HttpError(503, "Administrator access is not configured."));
    return;
  }
  const expectedBytes = Buffer.from(expected);
  const providedBytes = provided ? Buffer.from(provided) : Buffer.alloc(0);
  if (providedBytes.length !== expectedBytes.length
    || !timingSafeEqual(providedBytes, expectedBytes)) {
    next(new HttpError(401, "Administrator credentials are invalid."));
    return;
  }
  next();
}

function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>,
) {
  return (request: Request, response: Response, next: NextFunction) => {
    void handler(request, response, next).catch(next);
  };
}

function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((issue) => issue.message).join(" "));
  }
  return parsed.data;
}

function publicSeller(row: SellerRow) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    status: row.status,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at.toISOString(),
  };
}

function publicStore(row: StoreRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    phone: row.phone,
    isPublic: row.is_public,
    createdAt: row.created_at.toISOString(),
  };
}

function publicStorefront(row: StoreRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    isPublic: row.is_public,
    createdAt: row.created_at.toISOString(),
  };
}

function publicProduct(row: ProductRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    imageUrl: row.image_url,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
  };
}

function storeSlug(name: string): string {
  const base = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  return `${base || "boutique"}-${randomUUID().slice(0, 8)}`;
}

async function sellerAndStore(sellerId: string) {
  const [seller, store] = await Promise.all([
    queryOne<SellerRow>(
      `SELECT id, full_name, email, password_hash, status, rejection_reason, created_at FROM sellers WHERE id = $1`,
      [sellerId],
    ),
    queryOne<StoreRow>(
      `SELECT id, seller_id, name, slug, description, category, phone, is_public, created_at
         FROM stores WHERE seller_id = $1`,
      [sellerId],
    ),
  ]);
  return seller && store ? { seller, store } : null;
}

router.post("/auth/register", authLimiter, asyncHandler(async (request, response) => {
  const input = validate(registerSchema, request.body);
  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    const records = await inTransaction(async (client) => {
      const sellerResult = await client.query<SellerRow>(
        `INSERT INTO sellers (email, full_name, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, full_name, email, password_hash, status, rejection_reason, created_at`,
        [input.email, input.fullName, passwordHash],
      );
      const seller = sellerResult.rows[0]!;
      const storeResult = await client.query<StoreRow>(
        `INSERT INTO stores (seller_id, name, slug, category, phone)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, seller_id, name, slug, description, category, phone, is_public, created_at`,
        [seller.id, input.storeName, storeSlug(input.storeName), input.category, input.phone],
      );
      return { seller, store: storeResult.rows[0]! };
    });
    const token = await createAccessToken(records.seller.id);
    response.status(201).json({ token, seller: publicSeller(records.seller), store: publicStore(records.store) });
  } catch (error) {
    if (isUniqueViolation(error, "sellers_email_unique")) {
      throw new HttpError(409, "An account with this email already exists.");
    }
    throw error;
  }
}));

router.post("/auth/login", authLimiter, asyncHandler(async (request, response) => {
  const input = validate(loginSchema, request.body);
  const seller = await queryOne<SellerRow>(
    `SELECT id, full_name, email, password_hash, status, rejection_reason, created_at FROM sellers WHERE email = $1`,
    [input.email],
  );
  if (!seller || !(await bcrypt.compare(input.password, seller.password_hash))) {
    throw new HttpError(401, "Email or password is incorrect.");
  }
  const result = await pool.query<StoreRow>(
    `SELECT id, seller_id, name, slug, description, category, phone, is_public, created_at
       FROM stores WHERE seller_id = $1`,
    [seller.id],
  );
  const store = result.rows[0];
  if (!store) throw new HttpError(500, "Seller store is unavailable.");
  const token = await createAccessToken(seller.id);
  response.json({ token, seller: publicSeller(seller), store: publicStore(store) });
}));

router.get("/seller/dashboard", requireSeller, asyncHandler(async (request, response) => {
  const records = await sellerAndStore(request.sellerId!);
  if (!records) throw new HttpError(404, "Seller account not found.");
  const productResult = await pool.query<ProductRow>(
    `SELECT id, store_id, name, description, price, image_url, is_active, created_at
       FROM products WHERE store_id = $1 ORDER BY created_at DESC`,
    [records.store.id],
  );
  response.json({
    seller: publicSeller(records.seller),
    store: publicStore(records.store),
    products: productResult.rows.map(publicProduct),
  });
}));

router.get("/admin/verify", adminLimiter, requireAdmin, (_request, response) => {
  response.json({ authenticated: true });
});

router.get("/admin/sellers", requireAdmin, asyncHandler(async (_request, response) => {
  const result = await pool.query(
    `SELECT s.id, s.full_name, s.email, s.status, s.rejection_reason, s.created_at,
            st.id AS store_id, st.name AS store_name, st.slug AS store_slug,
            st.category AS store_category, st.phone AS store_phone
       FROM sellers s
       JOIN stores st ON st.seller_id = s.id
      WHERE s.status IN ('pending_review', 'rejected')
      ORDER BY s.created_at ASC`,
  );
  response.json({
    sellers: result.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      status: row.status,
      rejectionReason: row.rejection_reason,
      createdAt: row.created_at.toISOString(),
      store: {
        id: row.store_id,
        name: row.store_name,
        slug: row.store_slug,
        category: row.store_category,
        phone: row.store_phone,
      },
    })),
  });
}));

router.post("/admin/sellers/:id/approve", requireAdmin, asyncHandler(async (request, response) => {
  const { id } = validate(z.object({ id: z.string().uuid() }), request.params);
  const result = await inTransaction(async (client) => {
    const seller = await client.query(
      `UPDATE sellers SET status = 'active', rejection_reason = NULL
        WHERE id = $1 AND status IN ('pending_review', 'rejected')
        RETURNING id`,
      [id],
    );
    if (seller.rowCount !== 1) return false;
    await client.query("UPDATE stores SET is_public = true WHERE seller_id = $1", [id]);
    return true;
  });
  if (!result) throw new HttpError(404, "Pending seller account not found.");
  response.json({ status: "active" });
}));

router.post("/admin/sellers/:id/reject", requireAdmin, asyncHandler(async (request, response) => {
  const { id } = validate(z.object({ id: z.string().uuid() }), request.params);
  const { reason } = validate(sellerRejectionSchema, request.body);
  const result = await inTransaction(async (client) => {
    const seller = await client.query(
      `UPDATE sellers SET status = 'rejected', rejection_reason = $2
        WHERE id = $1 AND status IN ('pending_review', 'rejected')
        RETURNING id`,
      [id, reason],
    );
    if (seller.rowCount !== 1) return false;
    await client.query("UPDATE stores SET is_public = false WHERE seller_id = $1", [id]);
    return true;
  });
  if (!result) throw new HttpError(404, "Pending seller account not found.");
  response.json({ status: "rejected" });
}));

router.post("/seller/products", requireSeller, asyncHandler(async (request, response) => {
  const input = validate(createProductSchema, request.body);
  const store = await queryOne<{ id: string; status: SellerRow["status"] }>(
    `SELECT st.id, s.status
       FROM stores st
       JOIN sellers s ON s.id = st.seller_id
      WHERE st.seller_id = $1`,
    [request.sellerId],
  );
  if (!store) throw new HttpError(404, "Seller store not found.");
  if (store.status !== "active") {
    throw new HttpError(403, "Your seller account must be approved before managing products.");
  }
  const inserted = await pool.query<ProductRow>(
    `INSERT INTO products (store_id, name, description, price, image_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, store_id, name, description, price, image_url, is_active, created_at`,
    [store.id, input.name, input.description, input.price, input.imageUrl],
  );
  response.status(201).json({ product: publicProduct(inserted.rows[0]!) });
}));

router.patch("/seller/products/:id", requireSeller, asyncHandler(async (request, response) => {
  const { id } = validate(z.object({ id: z.string().uuid() }), request.params);
  const input = validate(updateProductSchema, request.body);
  const updated = await pool.query<ProductRow>(
    `UPDATE products p SET is_active = $1
       FROM stores st
      WHERE p.id = $2 AND p.store_id = st.id AND st.seller_id = $3
        AND EXISTS (
          SELECT 1 FROM sellers s
           WHERE s.id = st.seller_id AND s.status = 'active'
        )
      RETURNING p.id, p.store_id, p.name, p.description, p.price, p.image_url, p.is_active, p.created_at`,
    [input.isActive, id, request.sellerId],
  );
  if (!updated.rows[0]) throw new HttpError(404, "Product not found.");
  response.json({ product: publicProduct(updated.rows[0]) });
}));

router.get("/public/stores/:slug", asyncHandler(async (request, response) => {
  const { slug } = validate(z.object({ slug: z.string().min(1).max(120) }), request.params);
  const store = await queryOne<StoreRow>(
    `SELECT st.id, st.seller_id, st.name, st.slug, st.description, st.category, st.phone, st.is_public, st.created_at
       FROM stores st JOIN sellers s ON s.id = st.seller_id
      WHERE st.slug = $1 AND st.is_public = true AND s.status = 'active'`,
    [slug],
  );
  if (!store) throw new HttpError(404, "Public store not found.");
  const products = await pool.query<ProductRow>(
    `SELECT id, store_id, name, description, price, image_url, is_active, created_at
       FROM products WHERE store_id = $1 AND is_active = true ORDER BY created_at DESC`,
    [store.id],
  );
  response.json({ store: publicStorefront(store), products: products.rows.map(publicProduct) });
}));

function isUniqueViolation(error: unknown, constraint: string): boolean {
  return typeof error === "object" && error !== null
    && "code" in error && error.code === "23505"
    && "constraint" in error && error.constraint === constraint;
}

export default router;
