CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_number text NOT NULL UNIQUE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'awaiting_vendor_confirmation'
    CHECK (status IN ('awaiting_vendor_confirmation','confirmed','preparing','handed_to_carrier','in_transit','delivered','cancelled','delivery_failed','returned','disputed')),
  currency text NOT NULL DEFAULT 'XAF' CHECK (currency = 'XAF'),
  subtotal_xaf integer NOT NULL CHECK (subtotal_xaf >= 0),
  idempotency_key uuid NOT NULL UNIQUE,
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_account_created_idx ON orders (account_id, created_at DESC);

CREATE TABLE seller_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  seller_id uuid NOT NULL REFERENCES sellers(id) ON DELETE RESTRICT,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'awaiting_vendor_confirmation'
    CHECK (status IN ('awaiting_vendor_confirmation','confirmed','preparing','handed_to_carrier','in_transit','delivered','cancelled','delivery_failed','returned','disputed')),
  subtotal_xaf integer NOT NULL CHECK (subtotal_xaf >= 0),
  delivery_xaf integer CHECK (delivery_xaf IS NULL OR delivery_xaf >= 0),
  fees_xaf integer CHECK (fees_xaf IS NULL OR fees_xaf >= 0),
  commission_xaf integer CHECK (commission_xaf IS NULL OR commission_xaf >= 0),
  net_xaf integer CHECK (net_xaf IS NULL OR net_xaf >= 0),
  policy_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, seller_id)
);
CREATE INDEX seller_orders_store_created_idx ON seller_orders (store_id, created_at DESC);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_order_id uuid NOT NULL REFERENCES seller_orders(id) ON DELETE RESTRICT,
  inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE RESTRICT,
  product_id uuid,
  variant_id uuid,
  seller_name_snapshot text NOT NULL,
  store_name_snapshot text NOT NULL,
  product_name_snapshot text NOT NULL,
  variant_label_snapshot text NOT NULL,
  sku_snapshot text,
  unit_price_xaf integer NOT NULL CHECK (unit_price_xaf > 0),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 1000000),
  line_total_xaf integer NOT NULL CHECK (line_total_xaf > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_items_inventory_idx ON order_items (inventory_item_id);

CREATE TABLE order_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE RESTRICT,
  seller_order_id uuid REFERENCES seller_orders(id) ON DELETE RESTRICT,
  previous_status text,
  new_status text NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('customer','seller','system','admin')),
  actor_account_id uuid REFERENCES accounts(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 3 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((order_id IS NOT NULL AND seller_order_id IS NULL)
      OR (order_id IS NULL AND seller_order_id IS NOT NULL))
);
CREATE INDEX order_status_events_order_created_idx ON order_status_events (order_id, created_at DESC);
CREATE INDEX order_status_events_seller_order_created_idx ON order_status_events (seller_order_id, created_at DESC);

CREATE TABLE order_delivery_snapshots (
  order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE RESTRICT,
  full_name text NOT NULL,
  phone text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text NOT NULL DEFAULT '',
  city text NOT NULL,
  region text NOT NULL,
  country text NOT NULL DEFAULT 'CM' CHECK (country = 'CM'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION prevent_order_history_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Order history is append-only.';
  RETURN NULL;
END
$$;

CREATE TRIGGER order_status_events_append_only
  BEFORE UPDATE OR DELETE ON order_status_events
  FOR EACH ROW EXECUTE FUNCTION prevent_order_history_mutation();
CREATE TRIGGER order_status_events_no_truncate
  BEFORE TRUNCATE ON order_status_events
  FOR EACH STATEMENT EXECUTE FUNCTION prevent_order_history_mutation();
CREATE TRIGGER order_delivery_snapshots_immutable
  BEFORE UPDATE OR DELETE ON order_delivery_snapshots
  FOR EACH ROW EXECUTE FUNCTION prevent_order_history_mutation();
CREATE TRIGGER order_delivery_snapshots_no_truncate
  BEFORE TRUNCATE ON order_delivery_snapshots
  FOR EACH STATEMENT EXECUTE FUNCTION prevent_order_history_mutation();
