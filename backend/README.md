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

The seller UI uploads JPEG, PNG, or WebP images as `imageBase64` plus `imageMimeType`; files are limited to 3 MB and stored in PostgreSQL. The endpoint also retains support for legacy HTTPS `imageUrl` values.

`GET /api/public/products/:id/image` serves images only for active products in public, approved stores. `GET /api/seller/products/:id/image` requires a seller token and serves that seller's own product images.

### `PATCH /api/seller/products/:id`

Bearer token required. Request `{ "isActive": false }` or `{ "isActive": true }`. The product must belong to the authenticated seller. Returns `{ "product": ... }`.

### `GET /api/public/stores/:slug`

No token required. Only returns an approved seller's public store and active products, with `{ "store": ..., "products": [...] }`.

### `GET /api/public/stores`

No token required. Lists up to 16 approved public stores with up to four recent active products per store, using `{ "stores": [{ "store": ..., "products": [...] }] }`.

### `GET /health`

Returns `{ "status": "ok" }` after a successful database connectivity check; returns `500` if the database is unavailable.
