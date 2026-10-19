DO $$ BEGIN
  CREATE TYPE seller_status AS ENUM ('contract_pending', 'draft_acknowledged', 'active');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL,
  password_hash text NOT NULL,
  status seller_status NOT NULL DEFAULT 'contract_pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sellers_email_unique ON sellers (email);

CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL,
  phone text NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS stores_seller_unique ON stores (seller_id);
CREATE UNIQUE INDEX IF NOT EXISTS stores_slug_unique ON stores (slug);

CREATE TABLE IF NOT EXISTS contract_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  version text NOT NULL,
  signer_name text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  is_draft_acknowledgement boolean NOT NULL DEFAULT true,
  CONSTRAINT contract_acceptances_draft_only CHECK (is_draft_acknowledgement = true)
);
CREATE UNIQUE INDEX IF NOT EXISTS contract_acceptances_seller_unique ON contract_acceptances (seller_id);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price integer NOT NULL CHECK (price > 0),
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_store_created_idx ON products (store_id, created_at DESC);
