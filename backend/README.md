# ORIVFIDE Backend API

Standalone Node.js, TypeScript, Express REST API for seller accounts and stores. It lives beside `web/` and does not modify or serve the Next.js application.

## Local setup

Requirements: Node.js 20 or newer and a PostgreSQL database (Neon is supported).

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Set `DATABASE_URL` and `JWT_SECRET` in `.env`. Generate a local secret with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Apply the checked-in SQL migration, then run the API:

```powershell
npm run migrate
npm run dev
```

The API listens on port `4000` by default. `GET http://localhost:4000/health` checks both the process and its database connection. To build and run the compiled server:

```powershell
npm run build
npm start
```

`npm run typecheck` and `npm run lint` are also available. Do not commit `.env` or put credentials in source control.

The database integration test for inventory and accounts creates and drops a uniquely named temporary schema. Run it only against a dedicated test database, never production:

```powershell
$env:ORIVFIDE_TEST_DATABASE_URL = "postgresql://.../dedicated_test_database"
$env:ORIVFIDE_TEST_DATABASE_CONFIRM = "I understand only a temporary test schema will be created and dropped"
$env:ORIVFIDE_TEST_DATABASE_SSL = "true" # set for hosted PostgreSQL; omit for local PostgreSQL
npm run test:inventory
```

The test does not read `DATABASE_URL` or load `.env`. It exits as skipped unless both the dedicated test URL and exact confirmation are provided.

## Configuration and deployment

Required environment variables are checked at startup. Invalid or missing values stop the process with field-specific errors (secret values are not printed).

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL/Neon connection URL; use the pooled Neon URL for deployed services. |
| `JWT_SECRET` | Yes | At least 32 characters; use a unique, cryptographically random value per environment. |
| `ADMIN_API_KEY` | For admin actions | At least 32 random characters; configure the same value only in the backend and enter it at `/admin/connexion`. |
| `NODE_ENV` | No | `development`, `test`, or `production`. |
| `PORT` | No | HTTP port, default `4000`. |
| `DATABASE_SSL` | No | Defaults to `true`; set to `false` only for local PostgreSQL without TLS. |
| `DATABASE_POOL_MAX` | No | PostgreSQL pool size, default `10`. |
| `JWT_EXPIRES_IN` | No | Token expiry such as `7d` or `15m`, default `7d`. |
| `CORS_ORIGINS` | No | Comma-separated exact browser origins; defaults to `http://localhost:3000`. Wildcards are rejected. |
For Railway, set the service root directory to `/backend`. The checked-in `railway.json` configures the build, runs `npm run migrate` before deployment, starts the API with `npm start`, and checks `/health`. Set `DATABASE_URL`, `JWT_SECRET`, `ADMIN_API_KEY`, and `CORS_ORIGINS` in Railway's service variables; let Railway provide `PORT`. Point the web app's `BACKEND_API_URL` to the generated public service domain. For other providers, install dependencies with `npm ci`, run `npm run build`, apply `npm run migrate` as a release step, and start with `npm start`. The API uses Helmet, a 32 KB JSON body limit, HTTPS-only product image URLs, parameterized SQL, bcrypt password hashes, HS256 bearer tokens, and in-memory rate limits (use a shared rate-limit store when running multiple replicas). It handles `SIGINT` and `SIGTERM` by closing the HTTP server and PostgreSQL pool.

Neon credentials are not included. The migration runner tracks applied SQL filenames in `schema_migrations` and runs migrations transactionally.

The commercial and operational principles for the planned transaction-enabled marketplace, including decisions that still require confirmation, are documented in [the Phase 1 project framing](../docs/phase-1-cadrage-commercial-et-operationnel.md). This working document is not a substitute for legal review or partner contracts.

The target entities, stock reservation model, multi-seller order structure, state transitions, and decisions for subsequent phases are documented in [the Phase 2 architecture and roadmap](../docs/phase-2-architecture-et-modele-de-donnees.md). It is a design document; do not apply it as a production schema until migrations are reviewed and tested.

The detailed seller inventory design, API contracts, migration behavior, and acceptance tests for Phase 3 are documented in [the Phase 3 stock design](../docs/phase-3-conception-stock.md). Migration `004_product_inventory.sql` has been applied to the confirmed Neon production database. New environments must apply it before deploying code that uses inventory tables.

The customer account and multi-seller cart design is documented in [the Phase 4 cart and orders design](../docs/phase-4-conception-panier-commandes.md). Migration `005_customer_accounts_and_cart.sql` was applied to the Neon database configured in the local backend environment on 23 October 2026. Customer registration and access use email and password; WhatsApp verification is not part of the active flow. There is still no order/checkout implementation, and Phase 3 database integration testing remains a prerequisite to transaction implementation.

## Seller approval behavior

Registration creates a `pending_review` seller and a private store in one PostgreSQL transaction. The seller can log in to view the review status, but cannot manage products. An administrator approves or rejects the request at `/admin/vendeurs`; approval activates the seller and publishes the store, while rejection keeps it private and records a reason. Only approved sellers and active products are exposed publicly. Contract signing is intentionally not part of this flow while ORIVFIDE finalizes its agreement.

Seller dashboard, store updates, product creation, and product updates derive seller identity from a verified bearer token and constrain access to that seller's own store/products. Sellers can update their store name, description, category, and phone, and edit product name, description, price, and optionally replace its image. Product photos can be uploaded as JPEG, PNG, or WebP files up to 3 MB and are stored in PostgreSQL; public image delivery is limited to active products in approved public stores. Admin endpoints require `x-admin-key` matching `ADMIN_API_KEY`; the frontend stores that key in an HTTP-only, eight-hour cookie after successful verification.

## API contracts

Errors use `{ "error": "Human-readable message", "message": "Human-readable message" }` (rate-limit errors use `error`). Invalid input returns `400`, missing/invalid tokens `401`, duplicate registration `409`, and absent or non-owned records `404`.

### `POST /api/auth/register`

Request:

```json
{
  "fullName": "Amina Example",
  "email": "amina@example.com",
  "password": "at-least-10-characters",
  "storeName": "Maison Amina",
  "category": "Mode et accessoires",
  "phone": "+237600000000"
}
```

Returns `201` with `{ "token": "...", "seller": { "id", "fullName", "email", "status", "rejectionReason", "createdAt" }, "store": { "id", "name", "slug", "description", "category", "phone", "isPublic", "createdAt" } }`. New accounts are `pending_review`; the store starts with `isPublic: false`.

### `POST /api/auth/login`

Request `{ "email": "amina@example.com", "password": "..." }`. Returns `200` with the same `token`, `seller`, `store` structure as registration. Authentication failures use the same message for unknown email and bad password.

### `GET /api/seller/dashboard`

Requires `Authorization: Bearer <token>`. Returns `{ "seller": ..., "store": ..., "products": [...] }`. Product entries contain `id`, `name`, `description`, integer `price`, nullable `imageUrl`, `isActive`, and ISO `createdAt`.

### Administrator endpoints

Seller settings are available through `PATCH /api/seller/store` with `name`, `description`, `category`, and `phone`. Product details can be edited through `PATCH /api/seller/products/:id` with `name`, `description`, `price`, and optionally `imageBase64` plus `imageMimeType`; omitting the image keeps the current image. Both endpoints require a seller bearer token and enforce ownership.

Send `x-admin-key: <ADMIN_API_KEY>` on each request.

- `GET /api/admin/verify` verifies the key.
- `GET /api/admin/overview` returns seller, public-store, and product totals for the admin dashboard.
- `GET /api/admin/sellers` lists pending and previously rejected requests.
- `POST /api/admin/sellers/:id/approve` approves the seller and publishes the store.
- `POST /api/admin/sellers/:id/reject` requires `{ "reason": "..." }`, keeps the store private, and allows a later admin re-review.
- `GET /api/admin/stores?limit=50` lists the most recent stores and seller details; `limit` is between 1 and 50.
- `PATCH /api/admin/stores/:id` requires `{ "isPublic": false }` or `{ "isPublic": true }` to change storefront visibility. Only active approved sellers can be published.
- `GET /api/admin/products?limit=50` lists the most recent products with their store and seller details; `limit` is between 1 and 50.
- `PATCH /api/admin/products/:id` requires `{ "isActive": false }` or `{ "isActive": true }` to hide or republish a product without deleting it.

### `POST /api/seller/products`

Bearer token required. Request `{ "name": "Product", "description": "Optional", "price": 5000, "imageUrl": "https://example.com/image.jpg" }`; description and image URL may be omitted, and `imageUrl` may be null/empty. Non-empty image URLs must be valid HTTPS URLs without embedded credentials. Returns `201` with `{ "product": ... }`.

The seller UI uploads JPEG, PNG, or WebP images as `imageBase64` plus `imageMimeType`; files are limited to 3 MB and stored in PostgreSQL. The endpoint also retains support for legacy HTTPS `imageUrl` values. Product creation now atomically creates a default `Standard` variant, zeroed inventory, and an initial stock journal entry.

### Seller inventory

All routes require an active seller bearer token and restrict data to that seller's store.

- `GET /api/seller/inventory?limit=50&cursor=<variant-uuid>` lists inventory, variants, available quantities, thresholds, and stock status. Page size is limited to 50.
- `POST /api/seller/inventory/:inventoryItemId/movements` accepts `{ "quantityDelta": 12, "reason": "Réception fournisseur", "idempotencyKey": "<uuid>" }`. Nonzero adjustments are limited to one million units per request; insufficient stock or conflicting key reuse returns `409`.
- `PATCH /api/seller/inventory/:inventoryItemId/threshold` accepts `{ "lowStockThreshold": 5, "reason": "Seuil de réapprovisionnement", "idempotencyKey": "<uuid>" }`.
- `GET /api/seller/inventory/:inventoryItemId/movements?limit=20&cursor=<opaque-cursor>` returns the read-only movement history; page size is limited to 50.
- `POST /api/seller/products/:productId/variants` creates a variant with `{ "label": "Rouge / M", "sku": "SKU-01", "attributes": { "couleur": "Rouge", "taille": "M" } }`; SKU and attributes are optional.
- `PATCH /api/seller/variants/:variantId` with `{ "isActive": false }` archives a non-default variant.

Public product responses include only a boolean `available`; exact stock quantities remain private to the seller.

### Customer accounts and cart (migration 005)

The following routes depend on `005_customer_accounts_and_cart.sql`; apply it to each target database before running this API version.

- `POST /api/customer/auth/register` accepts `{ "fullName": "Amina Example", "email": "amina@example.com", "password": "at-least-10-characters" }`; creates the customer role and cart and returns an authentication token. An existing account can be linked to the customer role only when the account is active and the submitted password matches.
- `POST /api/customer/auth/login` uses the same email/password shape and returns a customer token with a distinct JWT audience/type from seller tokens.
- `GET /api/customer/me` returns the authenticated customer's profile.
- `GET /api/customer/cart` returns current product prices, available quantity and per-store line information.
- `POST /api/customer/cart/items` accepts `{ "inventoryItemId": "<uuid>", "quantity": 1 }`; adding a cart item does not reserve inventory.
- `PATCH /api/customer/cart/items/:itemId` accepts `{ "quantity": 2 }`.
- `DELETE /api/customer/cart/items/:itemId` removes only an item belonging to the authenticated customer's active cart.
- `DELETE /api/customer/cart/items` clears only the authenticated customer's active cart.

Customer cart/profile access requires a valid customer token but no phone verification. Customer tokens cannot be used on seller endpoints. Checkout, order creation, payments and delivery are not implemented; the web cart only provides an estimate and keeps confirmation disabled.

`GET /api/public/products/:id/image` serves images only for active products in public, approved stores. `GET /api/seller/products/:id/image` requires a seller token and serves that seller's own product images.

### `PATCH /api/seller/products/:id`

Bearer token required. Request `{ "isActive": false }` or `{ "isActive": true }`. The product must belong to the authenticated seller. Returns `{ "product": ... }`.

### `GET /api/public/stores/:slug`

No token required. Only returns an approved seller's public store and active products, with `{ "store": ..., "products": [...] }`.

### `GET /api/public/stores`

No token required. Lists up to 16 approved public stores with up to four recent active products per store, using `{ "stores": [{ "store": ..., "products": [...] }] }`.

### `GET /health`

Returns `{ "status": "ok" }` after a successful database connectivity check; returns `500` if the database is unavailable.
