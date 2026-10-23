DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM sellers
     GROUP BY lower(btrim(email))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot create unified accounts: seller emails are not unique when normalized.';
  END IF;
END
$$;

CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (email = lower(btrim(email))),
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 120),
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX accounts_email_unique ON accounts (email);

CREATE TABLE account_roles (
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('customer', 'seller')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, role)
);

ALTER TABLE sellers
  ADD COLUMN account_id uuid;

INSERT INTO accounts (id, email, full_name, password_hash, status, created_at)
SELECT id, lower(btrim(email)), full_name, password_hash, 'active', created_at
  FROM sellers;

UPDATE sellers SET account_id = id;

ALTER TABLE sellers
  ALTER COLUMN account_id SET NOT NULL,
  ADD CONSTRAINT sellers_account_unique UNIQUE (account_id),
  ADD CONSTRAINT sellers_account_fk
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;

INSERT INTO account_roles (account_id, role)
SELECT id, 'seller' FROM sellers;

CREATE TABLE carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'abandoned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX carts_one_active_per_account
  ON carts (account_id)
  WHERE status = 'active';
CREATE INDEX carts_account_status_idx ON carts (account_id, status);

CREATE TABLE cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES carts(id) ON DELETE RESTRICT,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 1000000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cart_items_cart_inventory_unique UNIQUE (cart_id, inventory_item_id)
);
CREATE INDEX cart_items_inventory_idx ON cart_items (inventory_item_id);

INSERT INTO carts (account_id)
SELECT id FROM accounts;
