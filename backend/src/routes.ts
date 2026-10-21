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
  updateStoreSchema,
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
  has_image_data: boolean;
  is_active: boolean;
  created_at: Date;
};

type ProductImageRow = {
  image_data: Buffer | null;
  image_mime_type: string | null;
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
    imageUrl: row.has_image_data ? `/api/products/${row.id}/image` : row.image_url,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
  };
}

function hasValidImageSignature(data: Buffer, mimeType: string): boolean {
  if (mimeType === "image/png") {
    return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mimeType === "image/jpeg") {
    return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }
  return mimeType === "image/webp"
    && data.length >= 12
    && data.toString("ascii", 0, 4) === "RIFF"
    && data.toString("ascii", 8, 12) === "WEBP";
}

function sendProductImage(
  result: ProductImageRow | null,
  response: Response,
  isPublic: boolean,
) {
  if (!result?.image_data || !result.image_mime_type) {
    throw new HttpError(404, "Product image not found.");
  }
  response
    .set("Content-Type", result.image_mime_type)
    .set("X-Content-Type-Options", "nosniff")
    .set("Cache-Control", isPublic ? "public, max-age=3600" : "private, no-store")
    .send(result.image_data);
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
    `SELECT id, store_id, name, description, price, image_url,
            image_data IS NOT NULL AS has_image_data, is_active, created_at
       FROM products WHERE store_id = $1 ORDER BY created_at DESC`,
    [records.store.id],
  );
  response.json({
    seller: publicSeller(records.seller),
    store: publicStore(records.store),
    products: productResult.rows.map(publicProduct),
  });
}));

router.patch("/seller/store", requireSeller, asyncHandler(async (request, response) => {
  const input = validate(updateStoreSchema, request.body);
  const updated = await pool.query<StoreRow>(
    `UPDATE stores st
        SET name = $1, description = $2, category = $3, phone = $4
       FROM sellers s
      WHERE st.seller_id = $5 AND s.id = st.seller_id AND s.status = 'active'
      RETURNING st.id, st.seller_id, st.name, st.slug, st.description, st.category,
                st.phone, st.is_public, st.created_at`,
    [input.name, input.description, input.category, input.phone, request.sellerId],
  );
  const store = updated.rows[0];
  if (!store) throw new HttpError(404, "Seller store not found.");
  response.json({ store: publicStore(store) });
}));

router.get("/admin/verify", adminLimiter, requireAdmin, (_request, response) => {
  response.json({ authenticated: true });
});

router.get("/admin/overview", requireAdmin, asyncHandler(async (_request, response) => {
  const result = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM sellers WHERE status = 'pending_review') AS pending_sellers,
       (SELECT COUNT(*)::int FROM sellers WHERE status = 'active') AS active_sellers,
       (SELECT COUNT(*)::int FROM sellers WHERE status = 'rejected') AS rejected_sellers,
       (SELECT COUNT(*)::int FROM stores WHERE is_public = true) AS public_stores,
       (SELECT COUNT(*)::int FROM products) AS total_products,
       (SELECT COUNT(*)::int FROM products WHERE is_active = true) AS active_products,
       (SELECT COUNT(*)::int FROM products WHERE is_active = false) AS hidden_products`,
  );
  const row = result.rows[0]!;
  response.json({
    overview: {
      pendingSellers: row.pending_sellers,
      activeSellers: row.active_sellers,
      rejectedSellers: row.rejected_sellers,
      publicStores: row.public_stores,
      totalProducts: row.total_products,
      activeProducts: row.active_products,
      hiddenProducts: row.hidden_products,
    },
  });
}));

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

router.get("/admin/products", requireAdmin, asyncHandler(async (request, response) => {
  const { limit } = validate(
    z.object({ limit: z.coerce.number().int().min(1).max(50).default(50) }),
    request.query,
  );
  const result = await pool.query<ProductRow & {
    store_name: string;
    store_slug: string;
    seller_name: string;
    seller_email: string;
  }>(
    `SELECT p.id, p.store_id, p.name, p.description, p.price, p.image_url,
            p.image_data IS NOT NULL AS has_image_data, p.is_active, p.created_at,
            st.name AS store_name, st.slug AS store_slug,
            s.full_name AS seller_name, s.email AS seller_email
       FROM products p
       JOIN stores st ON st.id = p.store_id
       JOIN sellers s ON s.id = st.seller_id
      ORDER BY p.created_at DESC
      LIMIT $1`,
    [limit],
  );
  response.json({
    products: result.rows.map((row) => ({
      ...publicProduct(row),
      store: { name: row.store_name, slug: row.store_slug },
      seller: { name: row.seller_name, email: row.seller_email },
    })),
  });
}));

router.get("/admin/stores", requireAdmin, asyncHandler(async (request, response) => {
  const { limit } = validate(
    z.object({ limit: z.coerce.number().int().min(1).max(50).default(50) }),
    request.query,
  );
  const result = await pool.query(
    `SELECT st.id, st.name, st.slug, st.description, st.category, st.phone,
            st.is_public, st.created_at, s.full_name AS seller_name,
            s.email AS seller_email, s.status AS seller_status,
            (SELECT COUNT(*)::int FROM products p WHERE p.store_id = st.id) AS product_count
       FROM stores st
       JOIN sellers s ON s.id = st.seller_id
      ORDER BY st.created_at DESC
      LIMIT $1`,
    [limit],
  );
  response.json({
    stores: result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      category: row.category,
      phone: row.phone,
      isPublic: row.is_public,
      createdAt: row.created_at.toISOString(),
      seller: {
        name: row.seller_name,
        email: row.seller_email,
        status: row.seller_status,
      },
      productCount: row.product_count,
    })),
  });
}));

router.patch("/admin/stores/:id", requireAdmin, asyncHandler(async (request, response) => {
  const { id } = validate(z.object({ id: z.string().uuid() }), request.params);
  const { isPublic } = validate(z.object({ isPublic: z.boolean() }), request.body);
  const existing = await queryOne<{ seller_status: SellerRow["status"] }>(
    `SELECT s.status AS seller_status
       FROM stores st
       JOIN sellers s ON s.id = st.seller_id
      WHERE st.id = $1`,
    [id],
  );
  if (!existing) throw new HttpError(404, "Store not found.");
  if (isPublic && existing.seller_status !== "active") {
    throw new HttpError(409, "Only approved active seller stores can be published.");
  }
  const result = await pool.query(
    `UPDATE stores SET is_public = $2 WHERE id = $1 RETURNING id, is_public`,
    [id, isPublic],
  );
  response.json({ store: { id: result.rows[0]!.id, isPublic: result.rows[0]!.is_public } });
}));

router.patch("/admin/products/:id", requireAdmin, asyncHandler(async (request, response) => {
  const { id } = validate(z.object({ id: z.string().uuid() }), request.params);
  const { isActive } = validate(z.object({ isActive: z.boolean() }), request.body);
  const result = await pool.query<ProductRow>(
    `UPDATE products
        SET is_active = $2
      WHERE id = $1
      RETURNING id, store_id, name, description, price, image_url,
                image_data IS NOT NULL AS has_image_data, is_active, created_at`,
    [id, isActive],
  );
  if (!result.rows[0]) throw new HttpError(404, "Product not found.");
  response.json({ product: publicProduct(result.rows[0]) });
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
  const imageData = input.imageBase64 ? Buffer.from(input.imageBase64, "base64") : null;
  if (
    imageData
    && input.imageMimeType
    && !hasValidImageSignature(imageData, input.imageMimeType)
  ) {
    throw new HttpError(400, "The uploaded file does not match its image type.");
  }
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
    `INSERT INTO products (
       store_id, name, description, price, image_url, image_data, image_mime_type
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, store_id, name, description, price, image_url,
               image_data IS NOT NULL AS has_image_data, is_active, created_at`,
    [
      store.id,
      input.name,
      input.description,
      input.price,
      input.imageUrl,
      imageData,
      imageData ? input.imageMimeType : null,
    ],
  );
  response.status(201).json({ product: publicProduct(inserted.rows[0]!) });
}));

router.get("/seller/products/:id/image", requireSeller, asyncHandler(async (request, response) => {
  const { id } = validate(z.object({ id: z.string().uuid() }), request.params);
  const image = await queryOne<ProductImageRow>(
    `SELECT p.image_data, p.image_mime_type
       FROM products p
       JOIN stores st ON st.id = p.store_id
       JOIN sellers s ON s.id = st.seller_id
      WHERE p.id = $1 AND s.id = $2 AND s.status = 'active'`,
    [id, request.sellerId],
  );
  sendProductImage(image, response, false);
}));

router.patch("/seller/products/:id", requireSeller, asyncHandler(async (request, response) => {
  const { id } = validate(z.object({ id: z.string().uuid() }), request.params);
  const input = validate(updateProductSchema, request.body);
  const imageData = input.imageBase64 ? Buffer.from(input.imageBase64, "base64") : null;
  if (
    imageData
    && input.imageMimeType
    && !hasValidImageSignature(imageData, input.imageMimeType)
  ) {
    throw new HttpError(400, "The uploaded file does not match its image type.");
  }
  const updated = await pool.query<ProductRow>(
    `UPDATE products p
        SET is_active = COALESCE($1, p.is_active),
            name = COALESCE($2, p.name),
            description = COALESCE($3, p.description),
            price = COALESCE($4, p.price),
            image_url = CASE WHEN $5::bytea IS NULL THEN p.image_url ELSE NULL END,
            image_data = COALESCE($5::bytea, p.image_data),
            image_mime_type = COALESCE($6, p.image_mime_type)
       FROM stores st
      WHERE p.id = $7 AND p.store_id = st.id AND st.seller_id = $8
        AND EXISTS (
          SELECT 1 FROM sellers s
           WHERE s.id = st.seller_id AND s.status = 'active'
        )
      RETURNING p.id, p.store_id, p.name, p.description, p.price, p.image_url,
                p.image_data IS NOT NULL AS has_image_data, p.is_active, p.created_at`,
    [
      input.isActive ?? null,
      input.name ?? null,
      input.description ?? null,
      input.price ?? null,
      imageData,
      imageData ? input.imageMimeType : null,
      id,
      request.sellerId,
    ],
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
    `SELECT id, store_id, name, description, price, image_url,
            image_data IS NOT NULL AS has_image_data, is_active, created_at
       FROM products WHERE store_id = $1 AND is_active = true ORDER BY created_at DESC`,
    [store.id],
  );
  response.json({ store: publicStorefront(store), products: products.rows.map(publicProduct) });
}));

router.get("/public/stores", asyncHandler(async (_request, response) => {
  const storesResult = await pool.query<StoreRow>(
    `SELECT st.id, st.seller_id, st.name, st.slug, st.description, st.category,
            st.phone, st.is_public, st.created_at
       FROM stores st
       JOIN sellers s ON s.id = st.seller_id
      WHERE st.is_public = true AND s.status = 'active'
      ORDER BY st.created_at DESC
      LIMIT 16`,
  );
  if (storesResult.rows.length === 0) {
    response.json({ stores: [] });
    return;
  }

  const storeIds = storesResult.rows.map((store) => store.id);
  const productsResult = await pool.query<ProductRow>(
    `SELECT p.id, p.store_id, p.name, p.description, p.price, p.image_url,
            p.has_image_data, p.is_active, p.created_at
       FROM stores st
       CROSS JOIN LATERAL (
         SELECT id, store_id, name, description, price, image_url,
                image_data IS NOT NULL AS has_image_data, is_active, created_at
           FROM products
          WHERE store_id = st.id AND is_active = true
          ORDER BY created_at DESC
          LIMIT 4
       ) p
      WHERE st.id = ANY($1::uuid[])
      ORDER BY p.created_at DESC`,
    [storeIds],
  );
  const productsByStore = new Map<string, ProductRow[]>();
  for (const product of productsResult.rows) {
    const products = productsByStore.get(product.store_id) ?? [];
    products.push(product);
    productsByStore.set(product.store_id, products);
  }
  response.json({
    stores: storesResult.rows.map((store) => ({
      store: publicStorefront(store),
      products: (productsByStore.get(store.id) ?? []).map(publicProduct),
    })),
  });
}));

router.get("/public/products/:id/image", asyncHandler(async (request, response) => {
  const { id } = validate(z.object({ id: z.string().uuid() }), request.params);
  const image = await queryOne<ProductImageRow>(
    `SELECT p.image_data, p.image_mime_type
       FROM products p
       JOIN stores st ON st.id = p.store_id
       JOIN sellers s ON s.id = st.seller_id
      WHERE p.id = $1 AND p.is_active = true
        AND st.is_public = true AND s.status = 'active'`,
    [id],
  );
  sendProductImage(image, response, true);
}));

function isUniqueViolation(error: unknown, constraint: string): boolean {
  return typeof error === "object" && error !== null
    && "code" in error && error.code === "23505"
    && "constraint" in error && error.constraint === constraint;
}

export default router;
