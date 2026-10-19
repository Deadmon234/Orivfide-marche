# ORIVFIDE Backend API

Standalone Node.js, TypeScript, Express REST API for seller accounts, seller workspaces, and public-test stores. It lives beside `web/` and does not modify or serve the Next.js application.

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
| `NODE_ENV` | No | `development`, `test`, or `production`. |
| `PORT` | No | HTTP port, default `4000`. |
| `DATABASE_SSL` | No | Defaults to `true`; set to `false` only for local PostgreSQL without TLS. |
| `DATABASE_POOL_MAX` | No | PostgreSQL pool size, default `10`. |
| `JWT_EXPIRES_IN` | No | Token expiry such as `7d` or `15m`, default `7d`. |
| `CORS_ORIGINS` | No | Comma-separated exact browser origins; defaults to `http://localhost:3000`. Wildcards are rejected. |
| `CONTRACT_DRAFT_VERSION` | No | Version recorded with each draft acknowledgement. |

For a deployment, configure the variables in the hosting provider's secret/environment settings, install dependencies with `npm ci`, run `npm run build`, apply `npm run migrate` as a release step, and start with `npm start`. Point the web app's `BACKEND_API_URL` to this service and configure its exact browser origin in `CORS_ORIGINS`. The API uses Helmet, a 32 KB JSON body limit, HTTPS-only product image URLs, parameterized SQL, bcrypt password hashes, HS256 bearer tokens, and an in-memory rate limit on registration/login (use a shared rate-limit store when running multiple replicas). It handles `SIGINT` and `SIGTERM` by closing the HTTP server and PostgreSQL pool.

Neon credentials are not included. The migration runner tracks applied SQL filenames in `schema_migrations` and runs migrations transactionally.

## Seller and public-test behavior

Registration creates the seller and its initially private store in one PostgreSQL transaction. A seller must explicitly acknowledge the versioned **non-contractual draft** before the store is listed. As requested for the public test flow, acknowledgement changes the seller state to `draft_acknowledged` and sets `store.isPublic = true`; the acknowledgement response and every public-store response explicitly mark the store as a draft/public test. This endpoint is not a contract signature or approval of final commercial terms. Public pages expose only active products. No endpoint activates a seller or signs a final agreement.

All seller dashboard, acknowledgement, create-product, and update-product operations derive the seller identity from the verified bearer token and constrain database access to that seller's own store/products.

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

Returns `201` with `{ "token": "...", "seller": { "id", "fullName", "email", "status", "createdAt" }, "store": { "id", "name", "slug", "description", "category", "phone", "isPublic", "createdAt" } }`. New accounts are `contract_pending`; the store starts with `isPublic: false`.

### `POST /api/auth/login`

Request `{ "email": "amina@example.com", "password": "..." }`. Returns `200` with the same `token`, `seller`, `store` structure as registration. Authentication failures use the same message for unknown email and bad password.

### `GET /api/seller/dashboard`

Requires `Authorization: Bearer <token>`. Returns `{ "seller": ..., "store": ..., "products": [...] }`. Product entries contain `id`, `name`, `description`, integer `price`, nullable `imageUrl`, `isActive`, and ISO `createdAt`.

### `POST /api/seller/contract-acknowledgement`

Requires a bearer token. Request `{ "signerName": "Amina Example", "acknowledge": true }`. `acknowledge` must be exactly `true`. Returns `200`:

```json
{
  "seller": { "id": "...", "fullName": "Amina Example", "email": "amina@example.com", "status": "draft_acknowledged", "createdAt": "..." },
  "store": { "id": "...", "name": "Maison Amina", "slug": "maison-amina-...", "description": "", "category": "Mode et accessoires", "phone": "+237600000000", "isPublic": true, "createdAt": "..." },
  "acknowledgement": { "version": "orivfide-seller-draft-v1", "signerName": "Amina Example", "acknowledgedAt": "...", "isDraftAcknowledgement": true },
  "isDraftAgreement": true,
  "publicTestStore": true,
  "status": "draft_acknowledged_public_test"
}
```

### `POST /api/seller/products`

Bearer token required. Request `{ "name": "Product", "description": "Optional", "price": 5000, "imageUrl": "https://example.com/image.jpg" }`; description and image URL may be omitted, and `imageUrl` may be null/empty. Non-empty image URLs must be valid HTTPS URLs without embedded credentials. Returns `201` with `{ "product": ... }`.

### `PATCH /api/seller/products/:id`

Bearer token required. Request `{ "isActive": false }` or `{ "isActive": true }`. The product must belong to the authenticated seller. Returns `{ "product": ... }`.

### `GET /api/public/stores/:slug`

No token required. Only returns a store whose `is_public` is true, and only active products. The response prominently includes:

```json
{
  "isDraftAgreement": true,
  "publicTestStore": true,
  "status": "draft_public_test",
  "store": { "..." : "..." },
  "products": []
}
```

### `GET /health`

Returns `{ "status": "ok" }` after a successful database connectivity check; returns `500` if the database is unavailable.
