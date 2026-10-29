import { Router, type Request, type Response, type NextFunction } from "express";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import {
  createAccessToken,
  createCustomerAccessToken,
  requireCustomer,
  requireSeller,
} from "./auth.js";
import { config } from "./config.js";
import { inTransaction, pool, queryOne } from "./db.js";
import { HttpError } from "./errors.js";
import { getMtnPaymentStatus, mtnPaymentConfigured, requestMtnPayment } from "./mtn-payment.js";
import {
  createProductSchema,
  createVariantSchema,
  cartItemSchema,
  cartQuantitySchema,
  checkoutConfirmSchema,
  checkoutPreviewSchema,
  customerRegisterSchema,
  inventoryMovementSchema,
  inventoryThresholdSchema,
  loginSchema,
  mtnPaymentInitiateSchema,
  paginationSchema,
  registerSchema,
  sellerOrderStatusSchema,
  sellerRejectionSchema,
  updateStoreSchema,
  updateProductSchema,
  updateVariantSchema,
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

type CustomerAccountRow = {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  status: "active" | "disabled";
  created_at: Date;
};

type CartItemRow = {
  id: string;
  inventory_item_id: string;
  variant_id: string;
  quantity: number;
  seller_id?: string;
  seller_name?: string;
  product_id: string;
  product_name: string;
  product_price: number;
  product_description: string;
  product_image_url: string | null;
  has_image_data: boolean;
  variant_label: string;
  sku: string | null;
  store_id: string;
  store_name: string;
  store_slug: string;
  on_hand: number;
  reserved: number;
  product_is_active: boolean;
  variant_is_active: boolean;
  store_is_public: boolean;
  seller_is_active: boolean;
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
  available?: boolean;
  variants?: Array<{
    inventoryItemId: string;
    label: string;
    sku: string | null;
    available: boolean;
  }>;
};

type InventoryRow = {
  id: string;
  variant_id: string;
  product_id: string;
  product_name: string;
  product_is_active: boolean;
  variant_label: string;
  sku: string | null;
  attributes: Record<string, string>;
  is_default: boolean;
  variant_is_active: boolean;
  on_hand: number;
  reserved: number;
  low_stock_threshold: number;
  version: string | number;
  updated_at: Date;
};

type StockMovementRow = {
  id: string;
  movement_type: string;
  delta_on_hand: number;
  on_hand_before: number;
  on_hand_after: number;
  reason: string;
  created_at: Date;
  request_hash: string;
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
const customerAuthLimiter = rateLimit({
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

function publicCustomer(row: CustomerAccountRow) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    createdAt: row.created_at.toISOString(),
  };
}

function publicCartItem(row: CartItemRow) {
  const available = Math.max(0, Number(row.on_hand) - Number(row.reserved));
  const purchasable = row.product_is_active
    && row.variant_is_active
    && row.store_is_public
    && row.seller_is_active
    && available > 0;
  return {
    id: row.id,
    inventoryItemId: row.inventory_item_id,
    quantity: Number(row.quantity),
    product: {
      id: row.product_id,
      name: row.product_name,
      description: row.product_description,
      price: Number(row.product_price),
      imageUrl: row.has_image_data ? `/api/products/${row.product_id}/image` : row.product_image_url,
    },
    variant: { label: row.variant_label, sku: row.sku },
    store: { id: row.store_id, name: row.store_name, slug: row.store_slug },
    availableQuantity: available,
    lineTotal: (BigInt(row.product_price) * BigInt(row.quantity)).toString(),
    canPurchase: purchasable && Number(row.quantity) <= available,
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
    ...(row.available === undefined ? {} : { available: row.available }),
    ...(row.variants === undefined ? {} : { variants: row.variants }),
    createdAt: row.created_at.toISOString(),
  };
}

function publicInventory(row: InventoryRow) {
  const onHand = Number(row.on_hand);
  const reserved = Number(row.reserved);
  const available = onHand - reserved;
  const threshold = Number(row.low_stock_threshold);
  return {
    id: row.id,
    variantId: row.variant_id,
    productId: row.product_id,
    productName: row.product_name,
    productIsActive: row.product_is_active,
    variantLabel: row.variant_label,
    sku: row.sku,
    attributes: row.attributes,
    isDefault: row.is_default,
    variantIsActive: row.variant_is_active,
    onHand,
    reserved,
    available,
    lowStockThreshold: threshold,
    stockStatus: available === 0
      ? "out_of_stock"
      : threshold > 0 && available <= threshold
        ? "low_stock"
        : "healthy",
    version: Number(row.version),
    updatedAt: row.updated_at.toISOString(),
  };
}

function publicStockMovement(row: StockMovementRow) {
  return {
    id: row.id,
    type: row.movement_type,
    quantityDelta: Number(row.delta_on_hand),
    onHandBefore: Number(row.on_hand_before),
    onHandAfter: Number(row.on_hand_after),
    reason: row.reason,
    createdAt: row.created_at.toISOString(),
  };
}

function requestHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function decodeMovementCursor(cursor: string): { createdAt: string; id: string } {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid movement cursor.");
  }
  const parsed = z.object({
    createdAt: z.string().datetime(),
    id: z.string().uuid(),
  }).safeParse(value);
  if (!parsed.success) throw new HttpError(400, "Invalid movement cursor.");
  return parsed.data;
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

async function requireActiveCustomer(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  try {
    const account = await queryOne<{ id: string }>(
      `SELECT a.id
         FROM accounts a
         JOIN account_roles role ON role.account_id = a.id AND role.role = 'customer'
        WHERE a.id = $1 AND a.status = 'active'`,
      [request.customerId],
    );
    if (!account) throw new HttpError(401, "Customer account is unavailable.");
    next();
  } catch (error) {
    next(error);
  }
}

async function getOrCreateActiveCart(accountId: string): Promise<string> {
  return inTransaction(async (client) => {
    await client.query(
      `INSERT INTO carts (account_id, status)
       VALUES ($1, 'active')
       ON CONFLICT (account_id) WHERE status = 'active' DO NOTHING`,
      [accountId],
    );
    const cart = await client.query<{ id: string }>(
      "SELECT id FROM carts WHERE account_id = $1 AND status = 'active'",
      [accountId],
    );
    if (!cart.rows[0]) throw new HttpError(500, "Customer cart is unavailable.");
    return cart.rows[0].id;
  });
}

async function customerCartItems(cartId: string): Promise<CartItemRow[]> {
  const result = await pool.query<CartItemRow>(
    `SELECT ci.id, ci.inventory_item_id, ci.quantity,
            p.id AS product_id, p.name AS product_name, p.price AS product_price,
            p.description AS product_description, p.image_url AS product_image_url,
            p.image_data IS NOT NULL AS has_image_data,
            v.label AS variant_label, v.sku,
            st.id AS store_id, st.name AS store_name, st.slug AS store_slug,
            i.on_hand, i.reserved, p.is_active AS product_is_active,
            v.is_active AS variant_is_active, st.is_public AS store_is_public,
            (s.status = 'active') AS seller_is_active
       FROM cart_items ci
       JOIN inventory_items i ON i.id = ci.inventory_item_id
       JOIN product_variants v ON v.id = i.variant_id
       JOIN products p ON p.id = v.product_id AND p.store_id = v.store_id
       JOIN stores st ON st.id = v.store_id
       JOIN sellers s ON s.id = st.seller_id
      WHERE ci.cart_id = $1
      ORDER BY st.name, p.name, v.label`,
    [cartId],
  );
  return result.rows;
}

router.post("/auth/register", authLimiter, asyncHandler(async (request, response) => {
  const input = validate(registerSchema, request.body);
  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    const records = await inTransaction(async (client) => {
      const accountId = randomUUID();
      await client.query(
        `INSERT INTO accounts (id, email, full_name, password_hash)
         VALUES ($1, $2, $3, $4)`,
        [accountId, input.email, input.fullName, passwordHash],
      );
      await client.query(
        "INSERT INTO account_roles (account_id, role) VALUES ($1, 'seller')",
        [accountId],
      );
      const sellerResult = await client.query<SellerRow>(
        `INSERT INTO sellers (id, account_id, email, full_name, password_hash)
         VALUES ($1, $1, $2, $3, $4)
         RETURNING id, full_name, email, password_hash, status, rejection_reason, created_at`,
        [accountId, input.email, input.fullName, passwordHash],
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
    if (isUniqueViolation(error, "sellers_email_unique") || isUniqueViolation(error, "accounts_email_unique")) {
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

router.post("/customer/auth/register", customerAuthLimiter, asyncHandler(async (request, response) => {
  const input = validate(customerRegisterSchema, request.body);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const account = await inTransaction(async (client) => {
    const existing = await client.query<CustomerAccountRow>(
      `SELECT id, email, full_name, password_hash, status, created_at
         FROM accounts
        WHERE email = $1
        FOR UPDATE`,
      [input.email],
    );
    let customer = existing.rows[0];
    if (customer) {
      if (customer.status !== "active" || !(await bcrypt.compare(input.password, customer.password_hash))) {
        throw new HttpError(409, "Cette adresse e-mail est déjà associée à un compte.");
      }
      await client.query(
        `INSERT INTO account_roles (account_id, role)
         VALUES ($1, 'customer')
         ON CONFLICT (account_id, role) DO NOTHING`,
        [customer.id],
      );
      await client.query(
        `INSERT INTO carts (account_id, status)
         VALUES ($1, 'active')
         ON CONFLICT (account_id) WHERE status = 'active' DO NOTHING`,
        [customer.id],
      );
      return customer;
    }

    const created = await client.query<CustomerAccountRow>(
      `INSERT INTO accounts (email, full_name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, password_hash, status, created_at`,
      [input.email, input.fullName, passwordHash],
    );
    customer = created.rows[0]!;
    await client.query(
      "INSERT INTO account_roles (account_id, role) VALUES ($1, 'customer')",
      [customer.id],
    );
    await client.query("INSERT INTO carts (account_id, status) VALUES ($1, 'active')", [customer.id]);
    return customer;
  }).catch((error: unknown) => {
    if (isUniqueViolation(error, "accounts_email_unique")) {
      throw new HttpError(409, "Cette adresse e-mail est déjà associée à un compte.");
    }
    throw error;
  });
  const token = await createCustomerAccessToken(account.id);
  response.status(201).json({ token, customer: publicCustomer(account) });
}));

router.post("/customer/auth/login", customerAuthLimiter, asyncHandler(async (request, response) => {
  const input = validate(loginSchema, request.body);
  const account = await queryOne<CustomerAccountRow>(
    `SELECT a.id, a.email, a.full_name, a.password_hash, a.status, a.created_at
       FROM accounts a
       JOIN account_roles role ON role.account_id = a.id AND role.role = 'customer'
      WHERE a.email = $1 AND a.status = 'active'`,
    [input.email],
  );
  if (!account || !(await bcrypt.compare(input.password, account.password_hash))) {
    throw new HttpError(401, "Email ou mot de passe incorrect.");
  }
  const token = await createCustomerAccessToken(account.id);
  response.json({ token, customer: publicCustomer(account) });
}));

router.get("/customer/me", requireCustomer, requireActiveCustomer, asyncHandler(async (request, response) => {
  const account = await queryOne<CustomerAccountRow>(
    `SELECT id, email, full_name, password_hash, status, created_at
       FROM accounts WHERE id = $1 AND status = 'active'`,
    [request.customerId],
  );
  if (!account) throw new HttpError(401, "Customer account is unavailable.");
  response.json({ customer: publicCustomer(account) });
}));

router.get("/customer/cart", requireCustomer, requireActiveCustomer, asyncHandler(async (request, response) => {
  const cartId = await getOrCreateActiveCart(request.customerId!);
  const items = (await customerCartItems(cartId)).map(publicCartItem);
  const subtotal = items
    .reduce((total, item) => total + BigInt(item.lineTotal), 0n)
    .toString();
  response.json({ items, subtotal, currency: "XAF" });
}));

router.post("/customer/cart/items", requireCustomer, requireActiveCustomer, asyncHandler(async (request, response) => {
  const input = validate(cartItemSchema, request.body);
  await inTransaction(async (client) => {
    const cartResult = await client.query<{ id: string }>(
      `SELECT id FROM carts
        WHERE account_id = $1 AND status = 'active'
        FOR UPDATE`,
      [request.customerId],
    );
    if (!cartResult.rows[0]) throw new HttpError(404, "Active cart not found.");
    const cartId = cartResult.rows[0].id;
    const inventoryResult = await client.query<{
      id: string;
      on_hand: number;
      reserved: number;
    }>(
      `SELECT i.id, i.on_hand, i.reserved
         FROM inventory_items i
         JOIN product_variants v ON v.id = i.variant_id
         JOIN products p ON p.id = v.product_id AND p.store_id = v.store_id
         JOIN stores st ON st.id = v.store_id
         JOIN sellers s ON s.id = st.seller_id
        WHERE i.id = $1 AND v.is_active = true AND p.is_active = true
          AND st.is_public = true AND s.status = 'active'
        FOR UPDATE OF i`,
      [input.inventoryItemId],
    );
    const inventory = inventoryResult.rows[0];
    if (!inventory) throw new HttpError(404, "Available product variant not found.");
    const available = Number(inventory.on_hand) - Number(inventory.reserved);
    const existingResult = await client.query<{ id: string; quantity: number }>(
      `SELECT id, quantity FROM cart_items
        WHERE cart_id = $1 AND inventory_item_id = $2
        FOR UPDATE`,
      [cartId, input.inventoryItemId],
    );
    const existing = existingResult.rows[0];
    const nextQuantity = Number(existing?.quantity ?? 0) + input.quantity;
    if (available < 1 || nextQuantity > available || nextQuantity > 1_000_000) {
      throw new HttpError(409, "La quantité demandée n’est plus disponible.");
    }
    if (existing) {
      await client.query(
        "UPDATE cart_items SET quantity = $2, updated_at = now() WHERE id = $1",
        [existing.id, nextQuantity],
      );
    } else {
      await client.query(
        `INSERT INTO cart_items (cart_id, inventory_item_id, quantity)
         VALUES ($1, $2, $3)`,
        [cartId, input.inventoryItemId, input.quantity],
      );
    }
    await client.query("UPDATE carts SET updated_at = now() WHERE id = $1", [cartId]);
  });
  response.status(200).json({ message: "Produit ajouté au panier." });
}));

router.patch("/customer/cart/items/:itemId", requireCustomer, requireActiveCustomer, asyncHandler(async (request, response) => {
  const { itemId } = validate(z.object({ itemId: z.string().uuid() }), request.params);
  const { quantity } = validate(cartQuantitySchema, request.body);
  await inTransaction(async (client) => {
    const cartResult = await client.query<{ id: string }>(
      `SELECT id FROM carts
        WHERE account_id = $1 AND status = 'active'
        FOR UPDATE`,
      [request.customerId],
    );
    if (!cartResult.rows[0]) throw new HttpError(404, "Cart item not found.");
    const cartId = cartResult.rows[0].id;
    const itemResult = await client.query<{ inventory_item_id: string }>(
      `SELECT inventory_item_id FROM cart_items
        WHERE id = $1 AND cart_id = $2`,
      [itemId, cartId],
    );
    if (!itemResult.rows[0]) throw new HttpError(404, "Cart item not found.");
    const inventoryResult = await client.query<{
      on_hand: number;
      reserved: number;
      product_is_active: boolean;
      variant_is_active: boolean;
      store_is_public: boolean;
      seller_is_active: boolean;
    }>(
      `SELECT i.on_hand, i.reserved, p.is_active AS product_is_active,
              v.is_active AS variant_is_active, st.is_public AS store_is_public,
              (s.status = 'active') AS seller_is_active
         FROM inventory_items i
         JOIN product_variants v ON v.id = i.variant_id
         JOIN products p ON p.id = v.product_id AND p.store_id = v.store_id
         JOIN stores st ON st.id = v.store_id
         JOIN sellers s ON s.id = st.seller_id
        WHERE i.id = $1
        FOR UPDATE OF i`,
      [itemResult.rows[0].inventory_item_id],
    );
    const inventory = inventoryResult.rows[0];
    if (
      !inventory
      || !inventory.product_is_active
      || !inventory.variant_is_active
      || !inventory.store_is_public
      || !inventory.seller_is_active
      || quantity > Number(inventory.on_hand) - Number(inventory.reserved)
    ) {
      throw new HttpError(409, "La quantité demandée n’est plus disponible.");
    }
    await client.query(
      "UPDATE cart_items SET quantity = $2, updated_at = now() WHERE id = $1 AND cart_id = $3",
      [itemId, quantity, cartId],
    );
    await client.query("UPDATE carts SET updated_at = now() WHERE id = $1", [cartId]);
  });
  response.json({ message: "Quantité du panier mise à jour." });
}));

router.delete("/customer/cart/items/:itemId", requireCustomer, requireActiveCustomer, asyncHandler(async (request, response) => {
  const { itemId } = validate(z.object({ itemId: z.string().uuid() }), request.params);
  const result = await pool.query(
    `DELETE FROM cart_items ci
      USING carts c
      WHERE ci.id = $1 AND ci.cart_id = c.id
        AND c.account_id = $2 AND c.status = 'active'
      RETURNING ci.id`,
    [itemId, request.customerId],
  );
  if (result.rowCount !== 1) throw new HttpError(404, "Cart item not found.");
  response.json({ message: "Produit retiré du panier." });
}));

router.delete("/customer/cart/items", requireCustomer, requireActiveCustomer, asyncHandler(async (request, response) => {
  await pool.query(
    `DELETE FROM cart_items ci
      USING carts c
      WHERE ci.cart_id = c.id AND c.account_id = $1 AND c.status = 'active'`,
    [request.customerId],
  );
  response.json({ message: "Panier vidé." });
}));

router.get("/customer/orders", requireCustomer, requireActiveCustomer, asyncHandler(async (request, response) => {
  const result = await pool.query<{
    id: string;
    public_number: string;
    status: string;
    subtotal_xaf: number;
    currency: string;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT id, public_number, status, subtotal_xaf, currency, created_at, updated_at
       FROM orders WHERE account_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [request.customerId],
  );
  response.json({
    orders: result.rows.map((row) => ({
      id: row.id,
      publicNumber: row.public_number,
      status: row.status,
      subtotalXaf: Number(row.subtotal_xaf),
      currency: row.currency,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    })),
  });
}));

router.get("/customer/orders/:orderId", requireCustomer, requireActiveCustomer, asyncHandler(async (request, response) => {
  const { orderId } = validate(z.object({ orderId: z.string().uuid() }), request.params);
  const order = await queryOne<{
    id: string;
    public_number: string;
    status: string;
    subtotal_xaf: number;
    currency: string;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT id, public_number, status, subtotal_xaf, currency, created_at, updated_at
       FROM orders WHERE id = $1 AND account_id = $2`,
    [orderId, request.customerId],
  );
  if (!order) throw new HttpError(404, "Commande introuvable.");

  const sellerOrders = await pool.query<{
    id: string; status: string; subtotal_xaf: number; delivery_xaf: number | null;
    store_name: string; store_slug: string; created_at: Date; updated_at: Date;
  }>(
    `SELECT so.id, so.status, so.subtotal_xaf, so.delivery_xaf,
            st.name AS store_name, st.slug AS store_slug, so.created_at, so.updated_at
       FROM seller_orders so JOIN stores st ON st.id = so.store_id
      WHERE so.order_id = $1 ORDER BY st.name`,
    [order.id],
  );

  const sellerOrderIds = sellerOrders.rows.map((row) => row.id);
  const items = sellerOrderIds.length === 0 ? [] : (await pool.query<{
    id: string; seller_order_id: string; product_name_snapshot: string;
    variant_label_snapshot: string; sku_snapshot: string | null;
    unit_price_xaf: number; quantity: number; line_total_xaf: number;
  }>(
    `SELECT id, seller_order_id, product_name_snapshot, variant_label_snapshot, sku_snapshot,
            unit_price_xaf, quantity, line_total_xaf
       FROM order_items WHERE seller_order_id = ANY($1::uuid[]) ORDER BY product_name_snapshot`,
    [sellerOrderIds],
  )).rows;

  const events = await pool.query<{
    id: string; seller_order_id: string | null; previous_status: string | null;
    new_status: string; actor_type: string; reason: string; created_at: Date;
  }>(
    `SELECT id, seller_order_id, previous_status, new_status, actor_type, reason, created_at
       FROM order_status_events
      WHERE order_id = $1 OR seller_order_id = ANY($2::uuid[])
      ORDER BY created_at DESC`,
    [order.id, sellerOrderIds],
  );

  response.json({
    order: {
      id: order.id,
      publicNumber: order.public_number,
      status: order.status,
      subtotalXaf: Number(order.subtotal_xaf),
      currency: order.currency,
      createdAt: order.created_at.toISOString(),
      updatedAt: order.updated_at.toISOString(),
      sellerOrders: sellerOrders.rows.map((sellerOrder) => ({
        id: sellerOrder.id,
        status: sellerOrder.status,
        subtotalXaf: Number(sellerOrder.subtotal_xaf),
        deliveryXaf: sellerOrder.delivery_xaf,
        store: { name: sellerOrder.store_name, slug: sellerOrder.store_slug },
        createdAt: sellerOrder.created_at.toISOString(),
        updatedAt: sellerOrder.updated_at.toISOString(),
        items: items.filter((item) => item.seller_order_id === sellerOrder.id).map((item) => ({
          id: item.id,
          productName: item.product_name_snapshot,
          variantLabel: item.variant_label_snapshot,
          sku: item.sku_snapshot,
          unitPriceXaf: Number(item.unit_price_xaf),
          quantity: Number(item.quantity),
          lineTotalXaf: Number(item.line_total_xaf),
        })),
      })),
      events: events.rows.map((event) => ({
        id: event.id,
        sellerOrderId: event.seller_order_id,
        previousStatus: event.previous_status,
        newStatus: event.new_status,
        actorType: event.actor_type,
        reason: event.reason,
        createdAt: event.created_at.toISOString(),
      })),
    },
  });
}));

router.post("/checkout/preview", requireCustomer, requireActiveCustomer, asyncHandler(async (request, response) => {
  validate(checkoutPreviewSchema, request.body ?? {});
  const cartId = await getOrCreateActiveCart(request.customerId!);
  const items = await customerCartItems(cartId);
  if (items.length === 0) throw new HttpError(409, "Le panier est vide.");

  const unavailable = items.filter((item) => !item.product_is_active || !item.variant_is_active
    || !item.store_is_public || !item.seller_is_active
    || item.quantity > Math.max(0, Number(item.on_hand) - Number(item.reserved)));
  if (unavailable.length > 0) {
    throw new HttpError(409, "Le panier contient un article indisponible ou une quantité dépassée.");
  }

  const subtotal = items.reduce((total, item) => total + BigInt(item.product_price) * BigInt(item.quantity), 0n);
  const stores = new Map<string, { storeId: string; name: string; subtotalXaf: string }>();
  for (const item of items) {
    const lineTotal = BigInt(item.product_price) * BigInt(item.quantity);
    const current = stores.get(item.store_id) ?? { storeId: item.store_id, name: item.store_name, subtotalXaf: "0" };
    current.subtotalXaf = (BigInt(current.subtotalXaf) + lineTotal).toString();
    stores.set(item.store_id, current);
  }
  response.json({
    subtotalXaf: subtotal.toString(),
    currency: "XAF",
    stores: [...stores.values()],
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    checkoutEnabled: config.checkoutEnabled && mtnPaymentConfigured(),
  });
}));

router.post("/checkout/confirm", requireCustomer, requireActiveCustomer, asyncHandler(async (request, response) => {
  const input = validate(checkoutConfirmSchema, request.body);
  if (!config.checkoutEnabled || !mtnPaymentConfigured()) {
    throw new HttpError(503, "La confirmation de commande est désactivée jusqu’à la configuration complète du paiement MTN Mobile Money sandbox.");
  }

  const requestHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const result = await inTransaction(async (client) => {
    const existing = await client.query<{ id: string; public_number: string; request_hash: string }>(
      "SELECT id, public_number, request_hash FROM orders WHERE account_id = $1 AND idempotency_key = $2",
      [request.customerId, input.idempotencyKey],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].request_hash !== requestHash) throw new HttpError(409, "Cette clé d’idempotence correspond à une autre commande.");
      return { id: existing.rows[0].id, publicNumber: existing.rows[0].public_number, repeated: true };
    }

    const cart = await client.query<{ id: string }>(
      "SELECT id FROM carts WHERE account_id = $1 AND status = 'active' FOR UPDATE",
      [request.customerId],
    );
    if (!cart.rows[0]) throw new HttpError(409, "Le panier est vide.");
    const cartId = cart.rows[0].id;

    const itemResult = await client.query<CartItemRow>(
      `SELECT ci.id, ci.inventory_item_id, v.id AS variant_id, ci.quantity,
              p.id AS product_id, p.name AS product_name, p.price AS product_price,
              p.description AS product_description, p.image_url AS product_image_url,
              p.image_data IS NOT NULL AS has_image_data,
              v.label AS variant_label, v.sku,
              st.id AS store_id, st.name AS store_name, st.slug AS store_slug,
              i.on_hand, i.reserved, p.is_active AS product_is_active,
              v.is_active AS variant_is_active, st.is_public AS store_is_public,
              (s.status = 'active') AS seller_is_active,
              s.id AS seller_id, s.full_name AS seller_name
         FROM cart_items ci
         JOIN inventory_items i ON i.id = ci.inventory_item_id
         JOIN product_variants v ON v.id = i.variant_id
         JOIN products p ON p.id = v.product_id AND p.store_id = v.store_id
         JOIN stores st ON st.id = v.store_id
         JOIN sellers s ON s.id = st.seller_id
        WHERE ci.cart_id = $1
        ORDER BY st.id, p.name, v.label
        FOR UPDATE OF i, ci`,
      [cartId],
    );
    if (itemResult.rows.length === 0) throw new HttpError(409, "Le panier est vide.");

    let subtotal = 0n;
    const grouped = new Map<string, { sellerId: string; storeId: string; sellerName: string; storeName: string; subtotal: bigint; items: CartItemRow[] }>();
    for (const item of itemResult.rows) {
      const available = Math.max(0, Number(item.on_hand) - Number(item.reserved));
      if (!item.product_is_active || !item.variant_is_active || !item.store_is_public || !item.seller_is_active || item.quantity > available) {
        throw new HttpError(409, "Le panier contient un article devenu indisponible.");
      }
      const lineTotal = BigInt(item.product_price) * BigInt(item.quantity);
      subtotal += lineTotal;
      if (subtotal > 2147483647n) throw new HttpError(409, "Le montant total dépasse la limite XAF prise en charge.");
      const sellerId = item.seller_id!;
      const current = grouped.get(sellerId) ?? {
        sellerId,
        storeId: item.store_id,
        sellerName: item.seller_name!,
        storeName: item.store_name,
        subtotal: 0n,
        items: [],
      };
      current.subtotal += lineTotal;
      current.items.push(item);
      grouped.set(sellerId, current);
    }

    const publicNumber = `ORV-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
    const order = await client.query<{ id: string }>(
      `INSERT INTO orders (public_number, account_id, status, subtotal_xaf, idempotency_key, request_hash)
       VALUES ($1, $2, 'awaiting_payment', $3, $4, $5) RETURNING id`,
      [publicNumber, request.customerId, subtotal.toString(), input.idempotencyKey, requestHash],
    );
    const orderId = order.rows[0]!.id;

    await client.query(
      `INSERT INTO order_delivery_snapshots
       (order_id, full_name, phone, address_line1, address_line2, city, region, country)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [orderId, input.delivery.fullName, input.delivery.phone, input.delivery.addressLine1,
        input.delivery.addressLine2, input.delivery.city, input.delivery.region, input.delivery.country],
    );

    for (const group of grouped.values()) {
      if (group.subtotal > 2147483647n) throw new HttpError(409, "Le montant d’une sous-commande dépasse la limite prise en charge.");
      const sellerOrder = await client.query<{ id: string }>(
        `INSERT INTO seller_orders (order_id, seller_id, store_id, status, subtotal_xaf)
         VALUES ($1, $2, $3, 'awaiting_payment', $4) RETURNING id`,
        [orderId, group.sellerId, group.storeId, group.subtotal.toString()],
      );
      const sellerOrderId = sellerOrder.rows[0]!.id;
      for (const item of group.items) {
        await client.query(
          `INSERT INTO order_items
           (seller_order_id, inventory_item_id, product_id, variant_id,
            seller_name_snapshot, store_name_snapshot, product_name_snapshot,
            variant_label_snapshot, sku_snapshot, unit_price_xaf, quantity, line_total_xaf)
           VALUES ($1, $2, $3, $4,
                   $5, $6, $7, $8, $9, $10, $11, $12)`,
          [sellerOrderId, item.inventory_item_id, item.product_id, item.variant_id,
            group.sellerName, group.storeName, item.product_name, item.variant_label,
            item.sku, item.product_price, item.quantity, (BigInt(item.product_price) * BigInt(item.quantity)).toString()],
        );
        const inventory = await client.query<{ on_hand: number; reserved: number }>(
          "SELECT on_hand, reserved FROM inventory_items WHERE id = $1 FOR UPDATE",
          [item.inventory_item_id],
        );
        const current = inventory.rows[0]!;
        const beforeReserved = Number(current.reserved);
        const quantity = item.quantity;
        if (Number(current.on_hand) - beforeReserved < quantity) throw new HttpError(409, "La quantité demandée n’est plus disponible.");
        await client.query(
          "UPDATE inventory_items SET reserved = reserved + $2::integer, version = version + 1, updated_at = now() WHERE id = $1",
          [item.inventory_item_id, quantity],
        );
        await client.query(
          `INSERT INTO stock_movements
           (inventory_item_id, movement_type, delta_on_hand, delta_reserved,
            on_hand_before, on_hand_after, reserved_before, reserved_after,
            reason, actor_type, reference_type, reference_id, idempotency_key, request_hash)
           VALUES ($1::uuid, 'reservation', 0, $2::integer, $3::integer, $3::integer, $4::integer, $4::integer + $2::integer,
                   $5, 'system', 'order', $6::uuid, $7::uuid, $8)`,
          [item.inventory_item_id, quantity, current.on_hand, beforeReserved,
            "Réservation confirmée pour la commande ORIVFIDE", orderId, randomUUID(), requestHash],
        );
      }
      await client.query(
        `INSERT INTO order_status_events
         (seller_order_id, previous_status, new_status, actor_type, actor_account_id, reason)
         VALUES ($1, NULL, 'awaiting_payment', 'customer', $2, 'Commande créée en attente du paiement MTN Mobile Money.')`,
        [sellerOrderId, request.customerId],
      );
    }

    await client.query(
      `INSERT INTO order_status_events
       (order_id, previous_status, new_status, actor_type, actor_account_id, reason)
       VALUES ($1, NULL, 'awaiting_payment', 'customer', $2, 'Commande parentale créée en attente du paiement MTN Mobile Money.')`,
      [orderId, request.customerId],
    );
    await client.query("UPDATE carts SET status = 'converted', updated_at = now() WHERE id = $1", [cartId]);
    return { id: orderId, publicNumber, repeated: false };
  });

  response.status(result.repeated ? 200 : 201).json({
    order: { id: result.id, publicNumber: result.publicNumber },
    message: result.repeated ? "Commande déjà créée en attente du paiement." : "Commande créée, stock réservé, paiement à finaliser.",
  });
}));

router.post("/checkout/payment/mtn/initiate", requireCustomer, requireActiveCustomer, asyncHandler(async (request, response) => {
  const input = validate(mtnPaymentInitiateSchema, request.body);
  if (!config.checkoutEnabled || !mtnPaymentConfigured()) {
    throw new HttpError(503, "Le paiement MTN Mobile Money sandbox n’est pas configuré.");
  }
  const requestHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");

  const result = await inTransaction(async (client) => {
    const order = await client.query<{ id: string; account_id: string; public_number: string; status: string; subtotal_xaf: number }>(
      "SELECT id, account_id, public_number, status, subtotal_xaf FROM orders WHERE id = $1 FOR UPDATE",
      [input.orderId],
    );
    const found = order.rows[0];
    if (!found || found.account_id !== request.customerId) throw new HttpError(404, "Commande introuvable.");
    if (found.status !== "awaiting_payment") throw new HttpError(409, "Cette commande n’attend plus un paiement MTN Mobile Money.");

    const existing = await client.query<{ id: string; provider_reference: string; status: string; provider_status: string | null; request_hash: string }>(
      "SELECT id, provider_reference::text AS provider_reference, status, provider_status, request_hash FROM payments WHERE order_id = $1",
      [input.orderId],
    );
    const payment = existing.rows[0];
    if (payment) {
      if (payment.request_hash !== requestHash) throw new HttpError(409, "Cette clé correspond à une autre demande de paiement.");
      return { id: payment.id, referenceId: payment.provider_reference, status: payment.status, publicNumber: found.public_number, amountXaf: found.subtotal_xaf, requestToProvider: payment.status === "pending" && payment.provider_status === null };
    }

    const referenceId = randomUUID();
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO payments
       (order_id, provider, provider_reference, status, amount_xaf, payer_phone, idempotency_key, request_hash)
       VALUES ($1, 'mtn_momo', $2, 'pending', $3, $4, $5, $6) RETURNING id`,
      [input.orderId, referenceId, found.subtotal_xaf, input.payerPhone, input.idempotencyKey, requestHash],
    );
    return { id: inserted.rows[0]!.id, referenceId, status: "pending", publicNumber: found.public_number, amountXaf: found.subtotal_xaf, requestToProvider: true };
  });

  if (result.requestToProvider) await requestMtnPayment({
    referenceId: result.referenceId,
    amountXaf: result.amountXaf,
    payerPhone: input.payerPhone,
    externalId: result.publicNumber,
    payerMessage: `Paiement commande ${result.publicNumber}`,
  });

  response.status(202).json({
    payment: { id: result.id, referenceId: result.referenceId, status: result.status, provider: "mtn_momo" },
    message: "Demande de paiement MTN Mobile Money envoyée. Interrogez le statut jusqu’à confirmation.",
  });
}));

router.get("/checkout/payment/mtn/:orderId/status", requireCustomer, requireActiveCustomer, asyncHandler(async (request, response) => {
  const { orderId } = validate(z.object({ orderId: z.string().uuid() }), request.params);
  const payment = await queryOne<{ id: string; provider_reference: string; status: string }>(
    `SELECT p.id, p.provider_reference::text AS provider_reference, p.status
       FROM payments p JOIN orders o ON o.id = p.order_id
      WHERE p.order_id = $1 AND o.account_id = $2`,
    [orderId, request.customerId],
  );
  if (!payment) throw new HttpError(404, "Paiement introuvable.");
  const providerStatus = await getMtnPaymentStatus(payment.provider_reference);

  await inTransaction(async (client) => {
    await client.query(
      "UPDATE payments SET status = $2, provider_status = $3, paid_at = CASE WHEN $2 = 'successful' THEN now() ELSE paid_at END WHERE id = $1",
      [payment.id, providerStatus, providerStatus],
    );
    if (providerStatus === "successful") {
      await client.query(
        "UPDATE orders SET status = 'awaiting_vendor_confirmation', updated_at = now() WHERE id = $1 AND status = 'awaiting_payment'",
        [orderId],
      );
      await client.query(
        "UPDATE seller_orders SET status = 'awaiting_vendor_confirmation', updated_at = now() WHERE order_id = $1 AND status = 'awaiting_payment'",
        [orderId],
      );
      await client.query(
        `INSERT INTO order_status_events
         (order_id, previous_status, new_status, actor_type, actor_account_id, reason)
         VALUES ($1, 'awaiting_payment', 'awaiting_vendor_confirmation', 'system', $2, 'Paiement MTN Mobile Money confirmé.')`,
        [orderId, request.customerId],
      );
      return;
    }

    if (["failed", "expired", "cancelled"].includes(providerStatus)) {
      const sellerOrders = await client.query<{ id: string }>(
        "SELECT id FROM seller_orders WHERE order_id = $1 AND status = 'awaiting_payment'",
        [orderId],
      );
      for (const sellerOrder of sellerOrders.rows) {
        const items = await client.query<{ inventory_item_id: string; quantity: number }>(
          "SELECT inventory_item_id, quantity FROM order_items WHERE seller_order_id = $1 AND inventory_item_id IS NOT NULL",
          [sellerOrder.id],
        );
        for (const item of items.rows) {
          const inventory = await client.query<{ on_hand: number; reserved: number }>(
            "SELECT on_hand, reserved FROM inventory_items WHERE id = $1::uuid FOR UPDATE",
            [item.inventory_item_id],
          );
          const current = inventory.rows[0];
          if (!current || current.reserved < item.quantity) continue;
          await client.query(
            "UPDATE inventory_items SET reserved = reserved - $2::integer, version = version + 1, updated_at = now() WHERE id = $1::uuid",
            [item.inventory_item_id, item.quantity],
          );
          await client.query(
            `INSERT INTO stock_movements
             (inventory_item_id, movement_type, delta_on_hand, delta_reserved,
              on_hand_before, on_hand_after, reserved_before, reserved_after,
              reason, actor_type, reference_type, reference_id, idempotency_key, request_hash)
             VALUES ($1::uuid, 'release', 0, -$2::integer, $3::integer, $3::integer,
                     $4::integer, $4::integer - $2::integer,
                     $5, 'system', 'order', $6::uuid, $7::uuid, $8)`,
            [item.inventory_item_id, item.quantity, current.on_hand, current.reserved,
              "Paiement MTN terminal : libération de la réservation", orderId, randomUUID(),
              createHash("sha256").update(`${orderId}:${item.inventory_item_id}:${providerStatus}:payment-terminal`).digest("hex")],
          );
        }
        await client.query(
          `INSERT INTO order_status_events
           (seller_order_id, previous_status, new_status, actor_type, reason)
           VALUES ($1, 'awaiting_payment', 'cancelled', 'system', $2)`,
          [sellerOrder.id, `Paiement MTN terminé avec le statut ${providerStatus}.`],
        );
        await client.query(
          "UPDATE seller_orders SET status = 'cancelled', updated_at = now() WHERE id = $1 AND status = 'awaiting_payment'",
          [sellerOrder.id],
        );
      }
      await client.query(
        "UPDATE orders SET status = 'cancelled', updated_at = now() WHERE id = $1 AND status = 'awaiting_payment'",
        [orderId],
      );
      await client.query(
        `INSERT INTO order_status_events
         (order_id, previous_status, new_status, actor_type, actor_account_id, reason)
         VALUES ($1, 'awaiting_payment', 'cancelled', 'system', $2, $3)`,
        [orderId, request.customerId, `Paiement MTN terminé avec le statut ${providerStatus}.`],
      );
    }
  });

  response.json({ payment: { status: providerStatus, provider: "mtn_momo", referenceId: payment.provider_reference } });
}));

router.get("/seller/orders", requireSeller, asyncHandler(async (request, response) => {
  const records = await sellerAndStore(request.sellerId!);
  if (!records || records.seller.status !== "active") throw new HttpError(403, "Seller account is not active.");
  const result = await pool.query<{
    id: string; order_id: string; status: string; subtotal_xaf: number;
    created_at: Date; updated_at: Date; public_number: string; order_status: string;
  }>(
    `SELECT so.id, so.order_id, so.status, so.subtotal_xaf, so.created_at, so.updated_at,
            o.public_number, o.status AS order_status
       FROM seller_orders so
       JOIN orders o ON o.id = so.order_id
      WHERE so.store_id = $1
      ORDER BY so.created_at DESC LIMIT 100`,
    [records.store.id],
  );
  response.json({ orders: result.rows.map((row) => ({
    id: row.id,
    orderId: row.order_id,
    publicNumber: row.public_number,
    status: row.status,
    orderStatus: row.order_status,
    subtotalXaf: Number(row.subtotal_xaf),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  })) });
}));

router.get("/seller/orders/:sellerOrderId", requireSeller, asyncHandler(async (request, response) => {
  const { sellerOrderId } = validate(z.object({ sellerOrderId: z.string().uuid() }), request.params);
  const records = await sellerAndStore(request.sellerId!);
  if (!records) throw new HttpError(404, "Seller account not found.");
  if (records.seller.status !== "active") throw new HttpError(403, "Seller account is not active.");
  const sellerOrder = await queryOne<{
    id: string; order_id: string; status: string; subtotal_xaf: number; created_at: Date; updated_at: Date;
    public_number: string; customer_name: string;
  }>(
    `SELECT so.id, so.order_id, so.status, so.subtotal_xaf, so.created_at, so.updated_at,
            o.public_number, a.full_name AS customer_name
       FROM seller_orders so JOIN orders o ON o.id = so.order_id JOIN accounts a ON a.id = o.account_id
      WHERE so.id = $1 AND so.store_id = $2`,
    [sellerOrderId, records.store.id],
  );
  if (!sellerOrder) throw new HttpError(404, "Sous-commande introuvable.");
  const [items, events] = await Promise.all([
    pool.query<{ id: string; product_name_snapshot: string; variant_label_snapshot: string; sku_snapshot: string | null; unit_price_xaf: number; quantity: number; line_total_xaf: number }>(
      `SELECT id, product_name_snapshot, variant_label_snapshot, sku_snapshot, unit_price_xaf, quantity, line_total_xaf
         FROM order_items WHERE seller_order_id = $1 ORDER BY product_name_snapshot`, [sellerOrder.id],
    ),
    pool.query<{ id: string; previous_status: string | null; new_status: string; actor_type: string; reason: string; created_at: Date }>(
      `SELECT id, previous_status, new_status, actor_type, reason, created_at
         FROM order_status_events WHERE seller_order_id = $1
         ORDER BY created_at DESC`, [sellerOrder.id],
    ),
  ]);
  response.json({ order: {
    id: sellerOrder.id,
    orderId: sellerOrder.order_id,
    publicNumber: sellerOrder.public_number,
    status: sellerOrder.status,
    subtotalXaf: Number(sellerOrder.subtotal_xaf),
    customerName: sellerOrder.customer_name,
    createdAt: sellerOrder.created_at.toISOString(),
    updatedAt: sellerOrder.updated_at.toISOString(),
    items: items.rows.map((item) => ({ id: item.id, productName: item.product_name_snapshot, variantLabel: item.variant_label_snapshot, sku: item.sku_snapshot, unitPriceXaf: Number(item.unit_price_xaf), quantity: Number(item.quantity), lineTotalXaf: Number(item.line_total_xaf) })),
    events: events.rows.map((event) => ({ id: event.id, previousStatus: event.previous_status, newStatus: event.new_status, actorType: event.actor_type, reason: event.reason, createdAt: event.created_at.toISOString() })),
  } });
}));

router.patch("/seller/orders/:sellerOrderId/status", requireSeller, asyncHandler(async (request, response) => {
  const { sellerOrderId } = validate(z.object({ sellerOrderId: z.string().uuid() }), request.params);
  const input = validate(sellerOrderStatusSchema, request.body);
  const records = await sellerAndStore(request.sellerId!);
  if (!records || records.seller.status !== "active") throw new HttpError(403, "Seller account is not active.");

  await inTransaction(async (client) => {
    const sellerOrder = await client.query<{ id: string; order_id: string; status: string }>(
      `SELECT id, order_id, status FROM seller_orders WHERE id = $1 AND store_id = $2 FOR UPDATE`,
      [sellerOrderId, records.store.id],
    );
    if (!sellerOrder.rows[0]) throw new HttpError(404, "Sous-commande introuvable.");
    const previous = sellerOrder.rows[0].status;
    const allowed: Record<string, string[]> = {
      awaiting_vendor_confirmation: ["confirmed", "cancelled"],
      confirmed: ["preparing", "cancelled"],
      preparing: ["handed_to_carrier", "cancelled"],
      handed_to_carrier: ["in_transit", "cancelled"],
      in_transit: ["delivered", "delivery_failed", "returned", "disputed"],
      delivered: [], cancelled: [], delivery_failed: ["returned", "disputed"], returned: ["disputed"], disputed: [],
    };
    if (previous === input.status) {
      throw new HttpError(409, `La sous-commande est déjà au statut ${input.status}.`);
    }
    if (!allowed[previous]?.includes(input.status)) {
      throw new HttpError(409, `Transition de statut non autorisée : ${previous} → ${input.status}.`);
    }

    await client.query(
      "UPDATE seller_orders SET status = $2, updated_at = now() WHERE id = $1",
      [sellerOrderId, input.status],
    );
    await client.query(
      `INSERT INTO order_status_events
       (seller_order_id, previous_status, new_status, actor_type, reason)
       VALUES ($1, $2, $3, 'seller', $4)`,
      [sellerOrderId, previous, input.status, input.reason],
    );

    if (input.status === "cancelled") {
      const items = await client.query<{ inventory_item_id: string; quantity: number }>(
        "SELECT inventory_item_id, quantity FROM order_items WHERE seller_order_id = $1 AND inventory_item_id IS NOT NULL",
        [sellerOrderId],
      );
      for (const item of items.rows) {
        if (!item.inventory_item_id) continue;
        const inventory = await client.query<{ on_hand: number; reserved: number }>(
          "SELECT on_hand, reserved FROM inventory_items WHERE id = $1 FOR UPDATE", [item.inventory_item_id],
        );
        const current = inventory.rows[0];
        if (!current || current.reserved < item.quantity) throw new HttpError(409, "La réservation à annuler est déjà incohérente.");
        await client.query(
          "UPDATE inventory_items SET reserved = reserved - $2::integer, version = version + 1, updated_at = now() WHERE id = $1::uuid",
          [item.inventory_item_id, item.quantity],
        );
        await client.query(
          `INSERT INTO stock_movements
           (inventory_item_id, movement_type, delta_on_hand, delta_reserved,
            on_hand_before, on_hand_after, reserved_before, reserved_after,
            reason, actor_type, actor_seller_id, reference_type, reference_id, idempotency_key, request_hash)
           VALUES ($1::uuid, 'release', 0, -$2::integer, $3::integer, $3::integer,
                   $4::integer, $4::integer - $2::integer,
                   $5, 'seller', $6::uuid, 'seller_order', $7::uuid, $8::uuid, $9)`,
          [item.inventory_item_id, item.quantity, current.on_hand, current.reserved,
            "Annulation de sous-commande : libération du stock réservé", records.seller.id, sellerOrderId, randomUUID(), createHash("sha256").update(`${sellerOrderId}:${item.inventory_item_id}:${item.quantity}:cancelled`).digest("hex")],
        );
      }
    }

    if (input.status === "delivered") {
      const items = await client.query<{ inventory_item_id: string; quantity: number }>(
        "SELECT inventory_item_id, quantity FROM order_items WHERE seller_order_id = $1 AND inventory_item_id IS NOT NULL",
        [sellerOrderId],
      );
      for (const item of items.rows) {
        const inventory = await client.query<{ on_hand: number; reserved: number }>(
          "SELECT on_hand, reserved FROM inventory_items WHERE id = $1::uuid FOR UPDATE",
          [item.inventory_item_id],
        );
        const current = inventory.rows[0];
        if (!current || current.reserved < item.quantity || current.on_hand < item.quantity) {
          throw new HttpError(409, "Le stock de cette sous-commande est incohérent et ne peut pas être vendu.");
        }
        await client.query(
          "UPDATE inventory_items SET on_hand = on_hand - $2::integer, reserved = reserved - $2::integer, version = version + 1, updated_at = now() WHERE id = $1::uuid",
          [item.inventory_item_id, item.quantity],
        );
        await client.query(
          `INSERT INTO stock_movements
           (inventory_item_id, movement_type, delta_on_hand, delta_reserved,
            on_hand_before, on_hand_after, reserved_before, reserved_after,
            reason, actor_type, actor_seller_id, reference_type, reference_id, idempotency_key, request_hash)
           VALUES ($1::uuid, 'sale', -$2::integer, -$2::integer,
                   $3::integer, $3::integer - $2::integer,
                   $4::integer, $4::integer - $2::integer,
                   $5, 'seller', $6::uuid, 'seller_order', $7::uuid, $8::uuid, $9)`,
          [item.inventory_item_id, item.quantity, current.on_hand, current.reserved,
            "Livraison confirmée : vente du stock réservé", records.seller.id, sellerOrderId,
            randomUUID(), createHash("sha256").update(`${sellerOrderId}:${item.inventory_item_id}:${item.quantity}:delivered`).digest("hex")],
        );
      }
    }

    const statuses = await client.query<{ status: string }>(
      "SELECT status FROM seller_orders WHERE order_id = $1", [sellerOrder.rows[0].order_id],
    );
    const values = statuses.rows.map((row) => row.status);
    let parentStatus = "awaiting_vendor_confirmation";
    if (values.length > 0 && values.every((status) => status === "delivered")) {
      parentStatus = "delivered";
    } else if (values.length > 0 && values.every((status) => status === "cancelled")) {
      parentStatus = "cancelled";
    } else if (values.includes("disputed")) {
      parentStatus = "disputed";
    } else if (values.includes("returned")) {
      parentStatus = "returned";
    } else if (values.includes("delivery_failed")) {
      parentStatus = "delivery_failed";
    } else if (values.includes("in_transit")) {
      parentStatus = "in_transit";
    } else if (values.includes("handed_to_carrier")) {
      parentStatus = "handed_to_carrier";
    } else if (values.includes("preparing")) {
      parentStatus = "preparing";
    } else if (values.some((status) => status === "confirmed")) {
      parentStatus = "confirmed";
    }
    const parentBefore = await client.query<{ status: string }>(
      "SELECT status FROM orders WHERE id = $1 FOR UPDATE",
      [sellerOrder.rows[0].order_id],
    );
    const previousParentStatus = parentBefore.rows[0]?.status ?? "awaiting_vendor_confirmation";
    await client.query("UPDATE orders SET status = $2, updated_at = now() WHERE id = $1", [sellerOrder.rows[0].order_id, parentStatus]);
    if (previousParentStatus !== parentStatus) {
      await client.query(
        `INSERT INTO order_status_events
         (order_id, previous_status, new_status, actor_type, reason)
         VALUES ($1, $2, $3, 'seller', $4)`,
        [sellerOrder.rows[0].order_id, previousParentStatus, parentStatus, `Mise à jour de la sous-commande : ${input.status}.`],
      );
    }
  });
  response.json({ message: "Statut de la sous-commande mis à jour." });
}));

router.get("/seller/dashboard", requireSeller, asyncHandler(async (request, response) => {
  const records = await sellerAndStore(request.sellerId!);
  if (!records) throw new HttpError(404, "Seller account not found.");
  const productResult = await pool.query<ProductRow>(
    `SELECT id, store_id, name, description, price, image_url,
            image_data IS NOT NULL AS has_image_data, is_active,
            EXISTS (
              SELECT 1
                FROM product_variants v
                JOIN inventory_items i ON i.variant_id = v.id
               WHERE v.product_id = products.id AND v.is_active = true
                 AND i.on_hand > i.reserved
            ) AS available,
            COALESCE((
              SELECT jsonb_agg(
                jsonb_build_object(
                  'inventoryItemId', i.id,
                  'label', v.label,
                  'sku', v.sku,
                  'available', i.on_hand > i.reserved
                ) ORDER BY v.is_default DESC, v.label
              )
                FROM product_variants v
                JOIN inventory_items i ON i.variant_id = v.id
               WHERE v.product_id = products.id AND v.is_active = true
            ), '[]'::jsonb) AS variants,
            created_at
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
  const product = await inTransaction(async (client) => {
    const storeResult = await client.query<{ id: string; status: SellerRow["status"] }>(
      `SELECT st.id, s.status
         FROM stores st
         JOIN sellers s ON s.id = st.seller_id
        WHERE st.seller_id = $1
        FOR UPDATE OF s`,
      [request.sellerId],
    );
    const store = storeResult.rows[0];
    if (!store) throw new HttpError(404, "Seller store not found.");
    if (store.status !== "active") {
      throw new HttpError(403, "Your seller account must be approved before managing products.");
    }
    const inserted = await client.query<ProductRow>(
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
    const createdProduct = inserted.rows[0]!;
    const variant = await client.query<{ id: string }>(
      `INSERT INTO product_variants (store_id, product_id, label, is_default)
       VALUES ($1, $2, 'Standard', true)
       RETURNING id`,
      [store.id, createdProduct.id],
    );
    const inventory = await client.query<{ id: string }>(
      `INSERT INTO inventory_items (variant_id) VALUES ($1) RETURNING id`,
      [variant.rows[0]!.id],
    );
    await client.query(
      `INSERT INTO stock_movements (
         inventory_item_id, movement_type, delta_on_hand, delta_reserved,
         on_hand_before, on_hand_after, reserved_before, reserved_after,
         reason, actor_type, idempotency_key, request_hash
       )
       VALUES ($1, 'initial', 0, 0, 0, 0, 0, 0,
               'Création du produit : stock initial non renseigné', 'system', $2, $3)`,
      [
        inventory.rows[0]!.id,
        randomUUID(),
        requestHash({ productId: createdProduct.id, onHand: 0 }),
      ],
    );
    return createdProduct;
  });
  response.status(201).json({ product: publicProduct({ ...product, available: false }) });
}));

router.get("/seller/inventory", requireSeller, asyncHandler(async (request, response) => {
  const { limit, cursor } = validate(paginationSchema, request.query);
  const result = await pool.query<InventoryRow>(
    `SELECT i.id, v.id AS variant_id, p.id AS product_id, p.name AS product_name,
            p.is_active AS product_is_active, v.label AS variant_label, v.sku,
            v.attributes, v.is_default, v.is_active AS variant_is_active,
            i.on_hand, i.reserved, i.low_stock_threshold, i.version, i.updated_at
       FROM inventory_items i
       JOIN product_variants v ON v.id = i.variant_id
       JOIN products p ON p.id = v.product_id AND p.store_id = v.store_id
       JOIN stores st ON st.id = v.store_id
       JOIN sellers s ON s.id = st.seller_id
      WHERE s.id = $1 AND s.status = 'active'
        AND ($2::uuid IS NULL OR v.id < $2::uuid)
      ORDER BY v.id DESC
      LIMIT $3`,
    [request.sellerId, cursor ?? null, limit + 1],
  );
  const hasMore = result.rows.length > limit;
  const rows = result.rows.slice(0, limit);
  response.json({
    inventory: rows.map(publicInventory),
    nextCursor: hasMore ? rows[rows.length - 1]!.variant_id : null,
  });
}));

router.post("/seller/inventory/:inventoryItemId/movements", requireSeller, asyncHandler(async (request, response) => {
  const { inventoryItemId } = validate(z.object({ inventoryItemId: z.string().uuid() }), request.params);
  const input = validate(inventoryMovementSchema, request.body);
  const hash = requestHash({
    inventoryItemId,
    quantityDelta: input.quantityDelta,
    reason: input.reason,
  });
  const result = await inTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [input.idempotencyKey]);
    const inventory = await client.query<InventoryRow>(
      `SELECT i.id, v.id AS variant_id, p.id AS product_id, p.name AS product_name,
              p.is_active AS product_is_active, v.label AS variant_label, v.sku,
              v.attributes, v.is_default, v.is_active AS variant_is_active,
              i.on_hand, i.reserved, i.low_stock_threshold, i.version, i.updated_at
         FROM inventory_items i
         JOIN product_variants v ON v.id = i.variant_id
         JOIN products p ON p.id = v.product_id AND p.store_id = v.store_id
         JOIN stores st ON st.id = v.store_id
         JOIN sellers s ON s.id = st.seller_id
        WHERE i.id = $1 AND s.id = $2 AND s.status = 'active'
        FOR UPDATE OF i`,
      [inventoryItemId, request.sellerId],
    );
    const current = inventory.rows[0];
    if (!current) throw new HttpError(404, "Inventory item not found.");

    const previousMovement = await client.query<StockMovementRow>(
      `SELECT id, movement_type, delta_on_hand, on_hand_before, on_hand_after,
              reason, created_at, request_hash
         FROM stock_movements WHERE idempotency_key = $1`,
      [input.idempotencyKey],
    );
    if (previousMovement.rows[0]) {
      if (previousMovement.rows[0].request_hash !== hash) {
        throw new HttpError(409, "This idempotency key was already used for a different request.");
      }
      return { inventory: current, movement: previousMovement.rows[0] };
    }

    const onHandBefore = Number(current.on_hand);
    const reserved = Number(current.reserved);
    const onHandAfter = onHandBefore + input.quantityDelta;
    if (onHandAfter < reserved || onHandAfter > 2_147_483_647) {
      throw new HttpError(409, "The adjustment cannot reduce stock below reserved units or exceed the stock limit.");
    }
    const movementType = input.quantityDelta > 0 ? "receipt" : "correction";
    await client.query(
      `UPDATE inventory_items
          SET on_hand = $2, version = version + 1, updated_at = now()
        WHERE id = $1`,
      [inventoryItemId, onHandAfter],
    );
    const movement = await client.query<StockMovementRow>(
      `INSERT INTO stock_movements (
         inventory_item_id, movement_type, delta_on_hand, delta_reserved,
         on_hand_before, on_hand_after, reserved_before, reserved_after,
         reason, actor_type, actor_seller_id, idempotency_key, request_hash
       )
       VALUES ($1, $2, $3, 0, $4, $5, $6, $6, $7, 'seller', $8, $9, $10)
       RETURNING id, movement_type, delta_on_hand, on_hand_before, on_hand_after,
                 reason, created_at, request_hash`,
      [
        inventoryItemId,
        movementType,
        input.quantityDelta,
        onHandBefore,
        onHandAfter,
        reserved,
        input.reason,
        request.sellerId,
        input.idempotencyKey,
        hash,
      ],
    );
    const createdMovement = movement.rows[0];
    if (!createdMovement) throw new HttpError(500, "Stock movement was not created.");
    return {
      inventory: { ...current, on_hand: onHandAfter, version: Number(current.version) + 1, updated_at: new Date() },
      movement: createdMovement,
    };
  });
  response.json({
    inventory: publicInventory(result.inventory),
    movement: publicStockMovement(result.movement),
  });
}));

router.patch("/seller/inventory/:inventoryItemId/threshold", requireSeller, asyncHandler(async (request, response) => {
  const { inventoryItemId } = validate(z.object({ inventoryItemId: z.string().uuid() }), request.params);
  const input = validate(inventoryThresholdSchema, request.body);
  const hash = requestHash({
    inventoryItemId,
    lowStockThreshold: input.lowStockThreshold,
    reason: input.reason,
  });
  const inventory = await inTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [input.idempotencyKey]);
    const locked = await client.query<InventoryRow>(
      `SELECT i.id, v.id AS variant_id, p.id AS product_id, p.name AS product_name,
              p.is_active AS product_is_active, v.label AS variant_label, v.sku,
              v.attributes, v.is_default, v.is_active AS variant_is_active,
              i.on_hand, i.reserved, i.low_stock_threshold, i.version, i.updated_at
         FROM inventory_items i
         JOIN product_variants v ON v.id = i.variant_id
         JOIN products p ON p.id = v.product_id AND p.store_id = v.store_id
         JOIN stores st ON st.id = v.store_id
         JOIN sellers s ON s.id = st.seller_id
        WHERE i.id = $1 AND s.id = $2 AND s.status = 'active'
        FOR UPDATE OF i`,
      [inventoryItemId, request.sellerId],
    );
    const current = locked.rows[0];
    if (!current) throw new HttpError(404, "Inventory item not found.");
    const previousEvent = await client.query<{ request_hash: string }>(
      "SELECT request_hash FROM inventory_threshold_events WHERE idempotency_key = $1",
      [input.idempotencyKey],
    );
    if (previousEvent.rows[0]) {
      if (previousEvent.rows[0].request_hash !== hash) {
        throw new HttpError(409, "This idempotency key was already used for a different request.");
      }
      return current;
    }

    const previousThreshold = Number(current.low_stock_threshold);
    await client.query(
      `UPDATE inventory_items
          SET low_stock_threshold = $2, version = version + 1, updated_at = now()
        WHERE id = $1`,
      [inventoryItemId, input.lowStockThreshold],
    );
    await client.query(
      `INSERT INTO inventory_threshold_events (
         inventory_item_id, threshold_before, threshold_after, reason,
         actor_seller_id, idempotency_key, request_hash
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        inventoryItemId,
        previousThreshold,
        input.lowStockThreshold,
        input.reason,
        request.sellerId,
        input.idempotencyKey,
        hash,
      ],
    );
    return {
      ...current,
      low_stock_threshold: input.lowStockThreshold,
      version: Number(current.version) + 1,
      updated_at: new Date(),
    };
  });
  response.json({ inventory: publicInventory(inventory) });
}));

router.get("/seller/inventory/:inventoryItemId/movements", requireSeller, asyncHandler(async (request, response) => {
  const { inventoryItemId } = validate(z.object({ inventoryItemId: z.string().uuid() }), request.params);
  const { limit, cursor } = validate(
    z.object({ limit: z.coerce.number().int().min(1).max(50).default(50), cursor: z.string().max(300).optional() }),
    request.query,
  );
  const item = await queryOne<{ id: string }>(
    `SELECT i.id
       FROM inventory_items i
       JOIN product_variants v ON v.id = i.variant_id
       JOIN stores st ON st.id = v.store_id
       JOIN sellers s ON s.id = st.seller_id
      WHERE i.id = $1 AND s.id = $2 AND s.status = 'active'`,
    [inventoryItemId, request.sellerId],
  );
  if (!item) throw new HttpError(404, "Inventory item not found.");
  const decodedCursor = cursor ? decodeMovementCursor(cursor) : null;
  const result = await pool.query(
    `SELECT id, movement_type, delta_on_hand, delta_reserved, on_hand_before,
            on_hand_after, reserved_before, reserved_after, reason, actor_type, created_at
       FROM stock_movements
      WHERE inventory_item_id = $1
        AND ($2::timestamptz IS NULL OR (created_at, id) < ($2::timestamptz, $3::uuid))
      ORDER BY created_at DESC, id DESC
      LIMIT $4`,
    [inventoryItemId, decodedCursor?.createdAt ?? null, decodedCursor?.id ?? null, limit + 1],
  );
  const hasMore = result.rows.length > limit;
  const movements = result.rows.slice(0, limit);
  const lastMovement = movements[movements.length - 1] as { id: string; created_at: Date } | undefined;
  response.json({
    movements,
    nextCursor: hasMore && lastMovement
      ? Buffer.from(JSON.stringify({
          createdAt: lastMovement.created_at.toISOString(),
          id: lastMovement.id,
        })).toString("base64url")
      : null,
  });
}));

router.post("/seller/products/:productId/variants", requireSeller, asyncHandler(async (request, response) => {
  const { productId } = validate(z.object({ productId: z.string().uuid() }), request.params);
  const input = validate(createVariantSchema, request.body);
  try {
    const variant = await inTransaction(async (client) => {
      const product = await client.query<{ id: string; store_id: string }>(
        `SELECT p.id, p.store_id
           FROM products p
           JOIN stores st ON st.id = p.store_id
           JOIN sellers s ON s.id = st.seller_id
          WHERE p.id = $1 AND s.id = $2 AND s.status = 'active'
          FOR UPDATE OF p`,
        [productId, request.sellerId],
      );
      if (!product.rows[0]) throw new HttpError(404, "Product not found.");
      const inserted = await client.query<{ id: string; label: string; sku: string | null; attributes: Record<string, string> }>(
        `INSERT INTO product_variants (store_id, product_id, label, sku, attributes)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         RETURNING id, label, sku, attributes`,
        [product.rows[0].store_id, productId, input.label, input.sku || null, JSON.stringify(input.attributes)],
      );
      const inventory = await client.query<{ id: string }>(
        "INSERT INTO inventory_items (variant_id) VALUES ($1) RETURNING id",
        [inserted.rows[0]!.id],
      );
      await client.query(
        `INSERT INTO stock_movements (
           inventory_item_id, movement_type, delta_on_hand, delta_reserved,
           on_hand_before, on_hand_after, reserved_before, reserved_after,
           reason, actor_type, idempotency_key, request_hash
         )
         VALUES ($1, 'initial', 0, 0, 0, 0, 0, 0,
                 'Création de la variante : stock initial non renseigné', 'system', $2, $3)`,
        [
          inventory.rows[0]!.id,
          randomUUID(),
          requestHash({ variantId: inserted.rows[0]!.id, onHand: 0 }),
        ],
      );
      return { ...inserted.rows[0]!, inventoryItemId: inventory.rows[0]!.id };
    });
    response.status(201).json({ variant });
  } catch (error) {
    if (isUniqueViolation(error, "product_variants_sku_unique")
      || isUniqueViolation(error, "product_variants_product_label_unique")) {
      throw new HttpError(409, "A variant with this SKU or label already exists in this product.");
    }
    throw error;
  }
}));

router.patch("/seller/variants/:variantId", requireSeller, asyncHandler(async (request, response) => {
  const { variantId } = validate(z.object({ variantId: z.string().uuid() }), request.params);
  validate(updateVariantSchema, request.body);
  const result = await inTransaction(async (client) => {
    const variant = await client.query<{ id: string; is_default: boolean; reserved: number }>(
      `SELECT v.id, v.is_default, i.reserved
         FROM product_variants v
         JOIN inventory_items i ON i.variant_id = v.id
         JOIN stores st ON st.id = v.store_id
         JOIN sellers s ON s.id = st.seller_id
        WHERE v.id = $1 AND s.id = $2 AND s.status = 'active'
        FOR UPDATE OF v, i`,
      [variantId, request.sellerId],
    );
    const current = variant.rows[0];
    if (!current) throw new HttpError(404, "Variant not found.");
    if (current.is_default) throw new HttpError(409, "The default variant cannot be archived.");
    if (Number(current.reserved) > 0) throw new HttpError(409, "A variant with reserved units cannot be archived.");
    const archived = await client.query<{ id: string; is_active: boolean }>(
      `UPDATE product_variants SET is_active = false, updated_at = now()
        WHERE id = $1 RETURNING id, is_active`,
      [variantId],
    );
    return archived.rows[0]!;
  });
  response.json({ variant: result });
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
            image_data IS NOT NULL AS has_image_data, is_active,
            EXISTS (
              SELECT 1
                FROM product_variants v
                JOIN inventory_items i ON i.variant_id = v.id
               WHERE v.product_id = products.id AND v.is_active = true
                 AND i.on_hand > i.reserved
            ) AS available,
            COALESCE((
              SELECT jsonb_agg(
                jsonb_build_object(
                  'inventoryItemId', i.id,
                  'label', v.label,
                  'sku', v.sku,
                  'available', i.on_hand > i.reserved
                ) ORDER BY v.is_default DESC, v.label
              )
                FROM product_variants v
                JOIN inventory_items i ON i.variant_id = v.id
               WHERE v.product_id = products.id AND v.is_active = true
            ), '[]'::jsonb) AS variants,
            created_at
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
            p.has_image_data, p.is_active, p.available, p.variants, p.created_at
       FROM stores st
       CROSS JOIN LATERAL (
         SELECT id, store_id, name, description, price, image_url,
                image_data IS NOT NULL AS has_image_data, is_active,
                EXISTS (
                  SELECT 1
                    FROM product_variants v
                    JOIN inventory_items i ON i.variant_id = v.id
                   WHERE v.product_id = products.id AND v.is_active = true
                     AND i.on_hand > i.reserved
                ) AS available,
                COALESCE((
                  SELECT jsonb_agg(
                    jsonb_build_object(
                      'inventoryItemId', i.id,
                      'label', v.label,
                      'sku', v.sku,
                      'available', i.on_hand > i.reserved
                    ) ORDER BY v.is_default DESC, v.label
                  )
                    FROM product_variants v
                    JOIN inventory_items i ON i.variant_id = v.id
                   WHERE v.product_id = products.id AND v.is_active = true
                ), '[]'::jsonb) AS variants,
                created_at
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
