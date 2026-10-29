import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import bcrypt from "bcryptjs";
import { Pool, type PoolClient } from "pg";

const databaseUrl = process.env.ORIVFIDE_TEST_DATABASE_URL;
const confirmed = process.env.ORIVFIDE_TEST_DATABASE_CONFIRM
  === "I understand only a temporary test schema will be created and dropped";
const canRun = Boolean(databaseUrl && confirmed);
const schema = `orivfide_test_api_${process.pid}_${randomUUID().replaceAll("-", "")}`;

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "temporary-local-migration-secret-at-least-32-chars";
}
if (!canRun && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://localhost/orivfide_test";
  process.env.DATABASE_SSL = "false";
}
if (canRun && databaseUrl) {
  const appDatabaseUrl = new URL(databaseUrl);
  if (appDatabaseUrl.hostname.includes("-pooler.")) {
    appDatabaseUrl.hostname = appDatabaseUrl.hostname.replace("-pooler.", ".");
  }
  appDatabaseUrl.searchParams.set("options", `-csearch_path=${schema}`);
  process.env.DATABASE_URL = appDatabaseUrl.toString();
  process.env.DATABASE_SSL = process.env.ORIVFIDE_TEST_DATABASE_SSL === "true" ? "true" : "false";
}

const { app } = await import("../src/app.js");

const testDatabaseUrl = canRun && databaseUrl
  ? (() => {
      const url = new URL(databaseUrl);
      if (url.hostname.includes("-pooler.")) {
        url.hostname = url.hostname.replace("-pooler.", ".");
      }
      url.searchParams.delete("options");
      return url.toString();
    })()
  : databaseUrl;

const pool = canRun && testDatabaseUrl
  ? new Pool({
      connectionString: testDatabaseUrl,
      ssl: process.env.ORIVFIDE_TEST_DATABASE_SSL === "true"
        ? { rejectUnauthorized: true }
        : false,
      max: 5,
    })
  : null;

function quotedSchema(): string {
  if (!/^orivfide_test_api_[a-z0-9_]+$/.test(schema)) {
    throw new Error("Refusing to use an unexpected API test schema name.");
  }
  return `"${schema}"`;
}

async function withTestClient<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  if (!pool) throw new Error("Seller order API test database is not configured.");
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${quotedSchema()}`);
    return await callback(client);
  } finally {
    client.release();
  }
}

let server: ReturnType<typeof app.listen> | null = null;
let baseUrl = "http://127.0.0.1";
let sellerOneEmail = "";
let sellerTwoEmail = "";
let sellerOnePassword = "Password123!";
let sellerTwoPassword = "Password456!";
let sellerOneOrderId = "";
let sellerTwoOrderId = "";

async function api<T>(path: string, init: RequestInit = {}): Promise<{ status: number; body: T }> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let body: T;
  try {
    body = text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    body = text as unknown as T;
  }
  return { status: response.status, body };
}

before(async () => {
  if (!canRun || !pool) return;
  await pool.query(`CREATE SCHEMA ${quotedSchema()}`);

  const migrationsUrl = new URL("../migrations/", import.meta.url);
  const migrationFiles = (await readdir(fileURLToPath(migrationsUrl)))
    .filter((filename) => /^00[1-7]_[a-z0-9_-]+\.sql$/i.test(filename))
    .sort();

  await withTestClient(async (client) => {
    for (const filename of migrationFiles) {
      const sql = await readFile(fileURLToPath(new URL(filename, migrationsUrl)), "utf8");
      await client.query(sql);
    }

    const sellerOneId = randomUUID();
    const sellerTwoId = randomUUID();
    const customerId = randomUUID();
    const storeOneId = randomUUID();
    const storeTwoId = randomUUID();
    const productOneId = randomUUID();
    const productTwoId = randomUUID();
    const variantOneId = randomUUID();
    const variantTwoId = randomUUID();
    const inventoryOneId = randomUUID();
    const inventoryTwoId = randomUUID();
    const orderOneId = randomUUID();
    const orderTwoId = randomUUID();

    sellerOneEmail = `seller-one-${randomUUID()}@example.test`;
    sellerTwoEmail = `seller-two-${randomUUID()}@example.test`;

    await client.query(
      `INSERT INTO accounts (id, email, full_name, password_hash, status)
       VALUES ($1, $2, 'Seller One', $3, 'active'),
              ($4, $5, 'Seller Two', $6, 'active'),
              ($7, $8, 'Customer One', $9, 'active')`,
      [
        sellerOneId,
        sellerOneEmail,
        await bcrypt.hash(sellerOnePassword, 12),
        sellerTwoId,
        sellerTwoEmail,
        await bcrypt.hash(sellerTwoPassword, 12),
        customerId,
        `customer-${randomUUID()}@example.test`,
        await bcrypt.hash("Customer123!", 12),
      ],
    );

    await client.query(
      `INSERT INTO account_roles (account_id, role)
       VALUES ($1, 'seller'), ($2, 'seller'), ($3, 'customer')`,
      [sellerOneId, sellerTwoId, customerId],
    );

    await client.query(
      `INSERT INTO sellers (id, account_id, email, full_name, password_hash, status)
       VALUES ($1, $1, $2, 'Seller One', $3, 'active'),
              ($4, $4, $5, 'Seller Two', $6, 'active')`,
      [
        sellerOneId,
        sellerOneEmail,
        await bcrypt.hash(sellerOnePassword, 12),
        sellerTwoId,
        sellerTwoEmail,
        await bcrypt.hash(sellerTwoPassword, 12),
      ],
    );

    await client.query(
      `INSERT INTO stores (id, seller_id, name, slug, category, phone, is_public)
       VALUES ($1, $2, 'Boutique One', 'boutique-one', 'Maison', '+237600000001', true),
              ($3, $4, 'Boutique Two', 'boutique-two', 'Maison', '+237600000002', true)`,
      [storeOneId, sellerOneId, storeTwoId, sellerTwoId],
    );

    await client.query(
      `INSERT INTO products (id, store_id, name, description, price, is_active)
       VALUES ($1, $2, 'Produit A', 'Produit A', 250, true),
              ($3, $4, 'Produit B', 'Produit B', 320, true)`,
      [productOneId, storeOneId, productTwoId, storeTwoId],
    );

    await client.query(
      `INSERT INTO product_variants (id, product_id, store_id, label, sku, is_default, is_active)
       VALUES ($1, $2, $3, 'Standard', 'SKU-ONE', true, true),
              ($4, $5, $6, 'Standard', 'SKU-TWO', true, true)`,
      [variantOneId, productOneId, storeOneId, variantTwoId, productTwoId, storeTwoId],
    );

    await client.query(
      `INSERT INTO inventory_items (id, variant_id, on_hand, reserved, low_stock_threshold, version)
       VALUES ($1, $2, 10, 0, 1, 0),
              ($3, $4, 12, 0, 1, 0)`,
      [inventoryOneId, variantOneId, inventoryTwoId, variantTwoId],
    );

    const orderOne = await client.query<{ id: string }>(
      `INSERT INTO orders (id, public_number, account_id, status, subtotal_xaf, idempotency_key, request_hash)
       VALUES ($1, $2, $3, 'awaiting_vendor_confirmation', 250, $4, repeat('d', 64))
       RETURNING id`,
      [orderOneId, `ORV-${randomUUID().slice(0, 8)}`.toUpperCase(), customerId, randomUUID()],
    );
    const orderTwo = await client.query<{ id: string }>(
      `INSERT INTO orders (id, public_number, account_id, status, subtotal_xaf, idempotency_key, request_hash)
       VALUES ($1, $2, $3, 'awaiting_vendor_confirmation', 320, $4, repeat('e', 64))
       RETURNING id`,
      [orderTwoId, `ORV-${randomUUID().slice(0, 8)}`.toUpperCase(), customerId, randomUUID()],
    );

    const sellerOrderOne = await client.query<{ id: string }>(
      `INSERT INTO seller_orders (order_id, seller_id, store_id, status, subtotal_xaf)
       VALUES ($1, $2, $3, 'awaiting_vendor_confirmation', 250)
       RETURNING id`,
      [orderOne.rows[0]!.id, sellerOneId, storeOneId],
    );
    const sellerOrderTwo = await client.query<{ id: string }>(
      `INSERT INTO seller_orders (order_id, seller_id, store_id, status, subtotal_xaf)
       VALUES ($1, $2, $3, 'awaiting_vendor_confirmation', 320)
       RETURNING id`,
      [orderTwo.rows[0]!.id, sellerTwoId, storeTwoId],
    );
    sellerOneOrderId = sellerOrderOne.rows[0]!.id;
    sellerTwoOrderId = sellerOrderTwo.rows[0]!.id;

    await client.query(
      `INSERT INTO order_items
       (seller_order_id, inventory_item_id, product_id, variant_id,
        seller_name_snapshot, store_name_snapshot, product_name_snapshot,
        variant_label_snapshot, sku_snapshot, unit_price_xaf, quantity, line_total_xaf)
       VALUES ($1, $2, $3, $4, 'Seller One', 'Boutique One', 'Produit A', 'Standard', 'SKU-ONE', 250, 1, 250),
              ($5, $6, $7, $8, 'Seller Two', 'Boutique Two', 'Produit B', 'Standard', 'SKU-TWO', 320, 1, 320)`,
      [sellerOneOrderId, inventoryOneId, productOneId, variantOneId, sellerTwoOrderId, inventoryTwoId, productTwoId, variantTwoId],
    );

    await client.query(
      `INSERT INTO order_status_events
       (seller_order_id, previous_status, new_status, actor_type, reason)
       VALUES ($1, NULL, 'awaiting_vendor_confirmation', 'system', 'Sous-commande créée'),
              ($2, NULL, 'awaiting_vendor_confirmation', 'system', 'Sous-commande créée')`,
      [sellerOneOrderId, sellerTwoOrderId],
    );
  });

  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind the seller order API test server.");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => error ? reject(error) : resolve());
    });
  }
  if (!pool) return;
  try {
    if (canRun) await pool.query(`DROP SCHEMA IF EXISTS ${quotedSchema()} CASCADE`);
  } finally {
    await pool.end();
  }
});

test(
  "seller order APIs enforce store ownership and status transitions",
  { skip: canRun ? false : "Set the explicitly confirmed ORIVFIDE_TEST_DATABASE_URL to run against an isolated test database." },
  async () => {
    if (!canRun || !pool) return;

    const loginOne = await api<{ token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: sellerOneEmail, password: sellerOnePassword }),
    });
    assert.equal(loginOne.status, 200);
    const sellerOneToken = loginOne.body.token;

    const loginTwo = await api<{ token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: sellerTwoEmail, password: sellerTwoPassword }),
    });
    assert.equal(loginTwo.status, 200);
    const sellerTwoToken = loginTwo.body.token;

    const list = await api<{ orders: Array<{ id: string }> }>("/api/seller/orders", {
      headers: { Authorization: `Bearer ${sellerOneToken}` },
    });
    assert.equal(list.status, 200);
    assert.deepEqual(list.body.orders.map((order) => order.id).sort(), [sellerOneOrderId].sort());

    const detail = await api<{ order: { id: string; status: string; customerName: string } }>(`/api/seller/orders/${sellerOneOrderId}`, {
      headers: { Authorization: `Bearer ${sellerOneToken}` },
    });
    assert.equal(detail.status, 200);
    assert.equal(detail.body.order.id, sellerOneOrderId);
    assert.equal(detail.body.order.status, "awaiting_vendor_confirmation");

    const forbidden = await api<{ error: string }>(`/api/seller/orders/${sellerOneOrderId}`, {
      headers: { Authorization: `Bearer ${sellerTwoToken}` },
    });
    assert.equal(forbidden.status, 404);

    const transition = await api<{ message: string }>(`/api/seller/orders/${sellerOneOrderId}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${sellerOneToken}` },
      body: JSON.stringify({ status: "confirmed", reason: "Commande validée." }),
    });
    assert.equal(transition.status, 200);
    assert.match(transition.body.message, /mis à jour/i);

    const invalid = await api<{ error: string }>(`/api/seller/orders/${sellerTwoOrderId}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${sellerTwoToken}` },
      body: JSON.stringify({ status: "delivered", reason: "Transition interdite." }),
    });
    assert.equal(invalid.status, 409);
    assert.ok(invalid.body.error.length > 0);

    const updatedStatus = await withTestClient(async (client) => {
      const result = await client.query<{ status: string }>(
        "SELECT status FROM seller_orders WHERE id = $1",
        [sellerOneOrderId],
      );
      return result.rows[0]!.status;
    });
    assert.equal(updatedStatus, "confirmed");
  },
);
