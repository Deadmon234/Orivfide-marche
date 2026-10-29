import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { Pool, type PoolClient } from "pg";

const databaseUrl = process.env.ORIVFIDE_TEST_DATABASE_URL;
const confirmed = process.env.ORIVFIDE_TEST_DATABASE_CONFIRM
  === "I understand only a temporary test schema will be created and dropped";
const canRun = Boolean(databaseUrl && confirmed);
const schema = `orivfide_test_${process.pid}_${randomUUID().replaceAll("-", "")}`;
const pool = canRun && databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: process.env.ORIVFIDE_TEST_DATABASE_SSL === "true"
        ? { rejectUnauthorized: true }
        : false,
      max: 5,
    })
  : null;

function quotedSchema(): string {
  if (!/^orivfide_test_[a-z0-9_]+$/.test(schema)) {
    throw new Error("Refusing to use an unexpected test schema name.");
  }
  return `"${schema}"`;
}

async function withTestClient<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  if (!pool) throw new Error("Inventory integration test database is not configured.");
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${quotedSchema()}`);
    return await callback(client);
  } finally {
    client.release();
  }
}

let sellerId = "";
let otherSellerId = "";
let storeId = "";
let otherStoreId = "";
let productId = "";
let otherProductId = "";
let inventoryId = "";
let customerId = "";
let otherCustomerId = "";
let customerCartItemId = "";
let orderId = "";
let sellerOrderId = "";
let otherSellerOrderId = "";

before(async () => {
  if (!canRun || !pool) return;
  await pool.query(`CREATE SCHEMA ${quotedSchema()}`);
  const migrationsUrl = new URL("../migrations/", import.meta.url);
  const migrationFiles = (await readdir(fileURLToPath(migrationsUrl)))
    .filter((filename) => /^00[1-3]_[a-z0-9_-]+\.sql$/i.test(filename))
    .sort();
  await withTestClient(async (client) => {
    for (const filename of migrationFiles) {
      const sql = await readFile(fileURLToPath(new URL(filename, migrationsUrl)), "utf8");
      await client.query(sql);
    }

    sellerId = randomUUID();
    otherSellerId = randomUUID();
    storeId = randomUUID();
    otherStoreId = randomUUID();
    productId = randomUUID();
    otherProductId = randomUUID();

    await client.query(
      `INSERT INTO sellers (id, email, full_name, password_hash, status)
       VALUES ($1, $2, 'Seller One', 'test-hash', 'active'),
              ($3, $4, 'Seller Two', 'test-hash', 'active')`,
      [sellerId, `${sellerId}@example.test`, otherSellerId, `${otherSellerId}@example.test`],
    );
    await client.query(
      `INSERT INTO stores (id, seller_id, name, slug, category, phone, is_public)
       VALUES ($1, $2, 'Store One', $3, 'Test', '+237600000001', true),
              ($4, $5, 'Store Two', $6, 'Test', '+237600000002', true)`,
      [storeId, sellerId, `${sellerId}-store`, otherStoreId, otherSellerId, `${otherSellerId}-store`],
    );
    await client.query(
      `INSERT INTO products (id, store_id, name, price, is_active)
       VALUES ($1, $2, 'Product One', 100, true),
              ($3, $4, 'Product Two', 200, true)`,
      [productId, storeId, otherProductId, otherStoreId],
    );
    await client.query(
      `ALTER TABLE products ADD COLUMN test_image_marker text;
       UPDATE products SET test_image_marker = 'preserve'`,
    );
  });

  const migration = await readFile(
    fileURLToPath(new URL("../migrations/004_product_inventory.sql", import.meta.url)),
    "utf8",
  );
  const customerMigration = await readFile(
    fileURLToPath(new URL("../migrations/005_customer_accounts_and_cart.sql", import.meta.url)),
    "utf8",
  );
  const ordersMigration = await readFile(
    fileURLToPath(new URL("../migrations/006_orders_checkout.sql", import.meta.url)),
    "utf8",
  );
  const paymentMigration = await readFile(
    fileURLToPath(new URL("../migrations/007_mtn_payments.sql", import.meta.url)),
    "utf8",
  );
  await withTestClient(async (client) => {
    await client.query("BEGIN");
    try {
      await client.query(migration);
      await client.query(customerMigration);
      await client.query(ordersMigration);
      await client.query(paymentMigration);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
    const inventoryResult = await client.query<{ id: string }>(
      `SELECT i.id
         FROM inventory_items i
         JOIN product_variants v ON v.id = i.variant_id
        WHERE v.product_id = $1 AND v.is_default = true`,
      [productId],
    );
    assert.equal(inventoryResult.rowCount, 1);
    inventoryId = inventoryResult.rows[0]!.id;
  });
});

after(async () => {
  if (!pool) return;
  try {
    if (canRun) await pool.query(`DROP SCHEMA IF EXISTS ${quotedSchema()} CASCADE`);
  } finally {
    await pool.end();
  }
});

test(
  "inventory and account migration invariants",
  { skip: canRun ? false : "Set the explicitly confirmed ORIVFIDE_TEST_DATABASE_URL to run against an isolated test database." },
  async (suite) => {
    await suite.test("backfills each existing product without changing its catalog data", async () => {
      await withTestClient(async (client) => {
        const result = await client.query<{
          product_id: string;
          label: string;
          is_default: boolean;
          on_hand: number;
          reserved: number;
          threshold: number;
          initial_count: number;
          marker: string;
          product_is_active: boolean;
        }>(
          `SELECT p.id AS product_id, v.label, v.is_default, i.on_hand, i.reserved,
                  i.low_stock_threshold AS threshold,
                  (SELECT COUNT(*)::int FROM stock_movements m
                    WHERE m.inventory_item_id = i.id AND m.movement_type = 'initial') AS initial_count,
                  p.test_image_marker AS marker, p.is_active AS product_is_active
             FROM products p
             JOIN product_variants v ON v.product_id = p.id AND v.is_default = true
             JOIN inventory_items i ON i.variant_id = v.id
            WHERE p.id = ANY($1::uuid[])
            ORDER BY p.id`,
          [[productId, otherProductId]],
        );
        assert.equal(result.rowCount, 2);
        for (const row of result.rows) {
          assert.equal(row.label, "Standard");
          assert.equal(row.is_default, true);
          assert.equal(row.on_hand, 0);
          assert.equal(row.reserved, 0);
          assert.equal(row.threshold, 0);
          assert.equal(row.initial_count, 1);
          assert.equal(row.marker, "preserve");
          assert.equal(row.product_is_active, true);
        }
      });
    });

    await suite.test("backfills seller accounts and creates one active cart per account", async () => {
      await withTestClient(async (client) => {
        const result = await client.query<{
          id: string;
          account_id: string;
          seller_roles: number;
          active_carts: number;
        }>(
          `SELECT s.id, s.account_id,
                  (SELECT COUNT(*)::int FROM account_roles r
                    WHERE r.account_id = s.account_id AND r.role = 'seller') AS seller_roles,
                  (SELECT COUNT(*)::int FROM carts c
                    WHERE c.account_id = s.account_id AND c.status = 'active') AS active_carts
             FROM sellers s
            WHERE s.id = ANY($1::uuid[])
            ORDER BY s.id`,
          [[sellerId, otherSellerId]],
        );
        assert.equal(result.rowCount, 2);
        for (const row of result.rows) {
          assert.equal(row.account_id, row.id);
          assert.equal(row.seller_roles, 1);
          assert.equal(row.active_carts, 1);
        }
      });
    });

    await suite.test("supports isolated customer carts and enforces cart invariants", async () => {
      await withTestClient(async (client) => {
        customerId = randomUUID();
        otherCustomerId = randomUUID();

        await client.query(
          `INSERT INTO accounts (id, email, full_name, password_hash, status)
           VALUES ($1, $2, 'Customer One', 'test-hash', 'active'),
                  ($3, $4, 'Customer Two', 'test-hash', 'active')`,
          [customerId, `${customerId}@example.test`, otherCustomerId, `${otherCustomerId}@example.test`],
        );
        await client.query(
          `INSERT INTO account_roles (account_id, role)
           VALUES ($1, 'customer'), ($2, 'customer')`,
          [customerId, otherCustomerId],
        );
        await client.query(
          `INSERT INTO carts (account_id, status)
           VALUES ($1, 'active'), ($2, 'active')`,
          [customerId, otherCustomerId],
        );
        await client.query("UPDATE inventory_items SET on_hand = 10 WHERE id = $1", [inventoryId]);

        const inserted = await client.query<{ id: string }>(
          `INSERT INTO cart_items (cart_id, inventory_item_id, quantity)
           SELECT id, $2, 3 FROM carts WHERE account_id = $1 AND status = 'active'
           RETURNING id`,
          [customerId, inventoryId],
        );
        customerCartItemId = inserted.rows[0]!.id;

        await assert.rejects(
          client.query(
            `INSERT INTO cart_items (cart_id, inventory_item_id, quantity)
             SELECT id, $2, 1 FROM carts WHERE account_id = $1 AND status = 'active'`,
            [customerId, inventoryId],
          ),
          { code: "23505" },
        );
        await assert.rejects(
          client.query("UPDATE cart_items SET quantity = 0 WHERE id = $1", [customerCartItemId]),
          { code: "23514" },
        );

        const otherAccountDelete = await client.query(
          `DELETE FROM cart_items ci
            USING carts c
            WHERE ci.id = $1 AND ci.cart_id = c.id
              AND c.account_id = $2 AND c.status = 'active'
            RETURNING ci.id`,
          [customerCartItemId, otherCustomerId],
        );
        assert.equal(otherAccountDelete.rowCount, 0);

        const ownedCart = await client.query<{ quantity: number }>(
          `SELECT ci.quantity
             FROM cart_items ci
             JOIN carts c ON c.id = ci.cart_id
            WHERE ci.id = $1 AND c.account_id = $2 AND c.status = 'active'`,
          [customerCartItemId, customerId],
        );
        assert.equal(ownedCart.rows[0]!.quantity, 3);
      });
    });

    await suite.test("creates seller order fixtures and enforces ownership and transitions", async () => {
      await withTestClient(async (client) => {
        const orderCustomerId = randomUUID();
        await client.query(
          `INSERT INTO accounts (id, email, full_name, password_hash, status)
           VALUES ($1, $2, 'Order Customer', 'test-hash', 'active')`,
          [orderCustomerId, `${orderCustomerId}@example.test`],
        );
        await client.query("INSERT INTO account_roles (account_id, role) VALUES ($1, 'customer')", [orderCustomerId]);
        await client.query("UPDATE inventory_items SET on_hand = 5, reserved = 0 WHERE id = $1", [inventoryId]);

        const order = await client.query<{ id: string }>(
          `INSERT INTO orders (public_number, account_id, status, subtotal_xaf, idempotency_key, request_hash)
           VALUES ($1, $2, 'awaiting_vendor_confirmation', 100, $3, repeat('c', 64)) RETURNING id`,
          [`ORV-${randomUUID().slice(0, 8)}`, orderCustomerId, randomUUID()],
        );
        orderId = order.rows[0]!.id;
        const owned = await client.query<{ id: string }>(
          `INSERT INTO seller_orders (order_id, seller_id, store_id, status, subtotal_xaf)
           VALUES ($1, $2, $3, 'awaiting_vendor_confirmation', 100) RETURNING id`,
          [orderId, sellerId, storeId],
        );
        sellerOrderId = owned.rows[0]!.id;
        const foreign = await client.query<{ id: string }>(
          `INSERT INTO seller_orders (order_id, seller_id, store_id, status, subtotal_xaf)
           VALUES ($1, $2, $3, 'awaiting_vendor_confirmation', 100) RETURNING id`,
          [orderId, otherSellerId, otherStoreId],
        );
        otherSellerOrderId = foreign.rows[0]!.id;

        await client.query("UPDATE inventory_items SET reserved = 2 WHERE id = $1", [inventoryId]);
        await client.query(
          `INSERT INTO order_items
           (seller_order_id, inventory_item_id, product_id, variant_id, seller_name_snapshot,
            store_name_snapshot, product_name_snapshot, variant_label_snapshot, unit_price_xaf,
            quantity, line_total_xaf)
           SELECT $1, $2, p.id, v.id, 'Seller One', 'Store One', p.name, v.label, 100, 2, 200
             FROM products p JOIN product_variants v ON v.product_id = p.id AND v.is_default = true
            WHERE p.id = $3`,
          [sellerOrderId, inventoryId, productId],
        );

        const ownedLookup = await client.query<{ id: string }>(
          `SELECT id FROM seller_orders WHERE id = $1 AND store_id = $2`,
          [sellerOrderId, storeId],
        );
        assert.equal(ownedLookup.rowCount, 1);
        const foreignLookup = await client.query<{ id: string }>(
          `SELECT id FROM seller_orders WHERE id = $1 AND store_id = $2`,
          [sellerOrderId, otherStoreId],
        );
        assert.equal(foreignLookup.rowCount, 0);

        await client.query(
          `INSERT INTO order_status_events
           (seller_order_id, previous_status, new_status, actor_type, reason)
           VALUES ($1, 'awaiting_vendor_confirmation', 'confirmed', 'seller', 'Commande confirmée pour le test')`,
          [sellerOrderId],
        );
        await assert.rejects(
          client.query(
            "UPDATE order_status_events SET reason = 'modification interdite' WHERE seller_order_id = $1",
            [sellerOrderId],
          ),
          /append-only/,
        );
      });
    });

    await suite.test("releases reservations only when seller cancellation is valid", async () => {
      await withTestClient(async (client) => {
        await client.query("BEGIN");
        try {
          const current = await client.query<{ status: string }>(
            "SELECT status FROM seller_orders WHERE id = $1 AND store_id = $2 FOR UPDATE",
            [sellerOrderId, storeId],
          );
          assert.equal(current.rows[0]!.status, "awaiting_vendor_confirmation");
          await client.query(
            "UPDATE inventory_items SET reserved = reserved - 2, version = version + 1 WHERE id = $1",
            [inventoryId],
          );
          await client.query(
            "UPDATE seller_orders SET status = 'cancelled', updated_at = now() WHERE id = $1",
            [sellerOrderId],
          );
          await client.query(
            `INSERT INTO order_status_events
             (seller_order_id, previous_status, new_status, actor_type, reason)
             VALUES ($1, 'awaiting_vendor_confirmation', 'cancelled', 'seller', 'Annulation validée par le vendeur')`,
            [sellerOrderId],
          );
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      });

      await withTestClient(async (client) => {
        const finalState = await client.query<{ reserved: number }>(
          "SELECT reserved FROM inventory_items WHERE id = $1",
          [inventoryId],
        );
        assert.equal(finalState.rows[0]!.reserved, 0);
        await assert.rejects(
          client.query("DELETE FROM order_status_events WHERE seller_order_id = $1", [sellerOrderId]),
          /append-only/,
        );
      });
    });

    await suite.test("prevents cross-seller inventory lookup and negative stock", async () => {
      await withTestClient(async (client) => {
        const ownership = await client.query(
          `SELECT i.id
             FROM inventory_items i
             JOIN product_variants v ON v.id = i.variant_id
             JOIN stores st ON st.id = v.store_id
            WHERE i.id = $1 AND st.seller_id = $2`,
          [inventoryId, otherSellerId],
        );
        assert.equal(ownership.rowCount, 0);

        await assert.rejects(
          client.query("UPDATE inventory_items SET on_hand = -1 WHERE id = $1", [inventoryId]),
          { code: "23514" },
        );
        await assert.rejects(
          client.query("UPDATE inventory_items SET reserved = 11 WHERE id = $1", [inventoryId]),
          { code: "23514" },
        );
      });
    });

    await suite.test("serializes concurrent removal of the last unit", async () => {
      await withTestClient(async (client) => {
        await client.query("UPDATE inventory_items SET on_hand = 1, reserved = 0 WHERE id = $1", [inventoryId]);
        await client.query(
          `INSERT INTO stock_movements (
             inventory_item_id, movement_type, delta_on_hand, delta_reserved,
             on_hand_before, on_hand_after, reserved_before, reserved_after,
             reason, actor_type, actor_seller_id, idempotency_key, request_hash
           )
           VALUES ($1, 'receipt', 1, 0, 0, 1, 0, 0, 'Test receipt',
                   'seller', $2, $3, repeat('a', 64))`,
          [inventoryId, sellerId, randomUUID()],
        );
      });

      async function removeLastUnit(key: string): Promise<boolean> {
        return withTestClient(async (client) => {
          await client.query("BEGIN");
          try {
            const selected = await client.query<{ on_hand: number; reserved: number }>(
              "SELECT on_hand, reserved FROM inventory_items WHERE id = $1 FOR UPDATE",
              [inventoryId],
            );
            const current = selected.rows[0]!;
            if (Number(current.on_hand) < 1 || Number(current.on_hand) - 1 < Number(current.reserved)) {
              await client.query("ROLLBACK");
              return false;
            }
            const updated = await client.query<{ on_hand: number }>(
              `UPDATE inventory_items
                  SET on_hand = on_hand - 1, version = version + 1
                WHERE id = $1 AND on_hand >= 1 AND on_hand - 1 >= reserved
                RETURNING on_hand`,
              [inventoryId],
            );
            if (updated.rowCount !== 1) {
              await client.query("ROLLBACK");
              return false;
            }
            await client.query(
              `INSERT INTO stock_movements (
                 inventory_item_id, movement_type, delta_on_hand, delta_reserved,
                 on_hand_before, on_hand_after, reserved_before, reserved_after,
                 reason, actor_type, actor_seller_id, idempotency_key, request_hash
               )
               VALUES ($1, 'correction', -1, 0, $2, $3, $4, $4, 'Test concurrent removal',
                       'seller', $5, $6, repeat('b', 64))`,
              [inventoryId, current.on_hand, Number(current.on_hand) - 1, current.reserved, sellerId, key],
            );
            await client.query("COMMIT");
            return true;
          } catch (error) {
            await client.query("ROLLBACK");
            throw error;
          }
        });
      }

      const results = await Promise.all([
        removeLastUnit(randomUUID()),
        removeLastUnit(randomUUID()),
      ]);
      assert.equal(results.filter(Boolean).length, 1);
      await withTestClient(async (client) => {
        const finalState = await client.query<{ on_hand: number; movement_count: number }>(
          `SELECT i.on_hand,
                  (SELECT COUNT(*)::int FROM stock_movements m
                    WHERE m.inventory_item_id = i.id AND m.movement_type = 'correction') AS movement_count
             FROM inventory_items i WHERE i.id = $1`,
          [inventoryId],
        );
        assert.equal(finalState.rows[0]!.on_hand, 0);
        assert.equal(finalState.rows[0]!.movement_count, 1);
      });
    });

    await suite.test("keeps inventory journals append-only", async () => {
      await withTestClient(async (client) => {
        const movement = await client.query<{ id: string }>(
          "SELECT id FROM stock_movements WHERE inventory_item_id = $1 LIMIT 1",
          [inventoryId],
        );
        await assert.rejects(
          client.query("UPDATE stock_movements SET reason = 'Changed' WHERE id = $1", [movement.rows[0]!.id]),
          /append-only/,
        );
        await assert.rejects(
          client.query("DELETE FROM stock_movements WHERE id = $1", [movement.rows[0]!.id]),
          /append-only/,
        );
      });
    });
  },
);
