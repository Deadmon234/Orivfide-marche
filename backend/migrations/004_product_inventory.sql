CREATE UNIQUE INDEX products_id_store_unique ON products (id, store_id);

CREATE TABLE product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL,
  label text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 120),
  sku text CHECK (sku IS NULL OR char_length(btrim(sku)) BETWEEN 1 AND 80),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(attributes) = 'object'),
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_variants_product_store_fk
    FOREIGN KEY (product_id, store_id)
    REFERENCES products (id, store_id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX product_variants_default_unique
  ON product_variants (product_id)
  WHERE is_default = true;
CREATE UNIQUE INDEX product_variants_sku_unique
  ON product_variants (store_id, sku)
  WHERE sku IS NOT NULL;
CREATE UNIQUE INDEX product_variants_product_label_unique
  ON product_variants (product_id, label);
CREATE INDEX product_variants_product_active_idx
  ON product_variants (product_id, is_active);

CREATE TABLE inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL UNIQUE
    REFERENCES product_variants(id) ON DELETE RESTRICT,
  on_hand integer NOT NULL DEFAULT 0 CHECK (on_hand BETWEEN 0 AND 2147483647),
  reserved integer NOT NULL DEFAULT 0 CHECK (reserved BETWEEN 0 AND on_hand),
  low_stock_threshold integer NOT NULL DEFAULT 0
    CHECK (low_stock_threshold BETWEEN 0 AND 2147483647),
  version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL
    REFERENCES inventory_items(id) ON DELETE RESTRICT,
  movement_type text NOT NULL CHECK (
    movement_type IN ('initial', 'receipt', 'correction', 'reservation', 'release', 'sale', 'return')
  ),
  delta_on_hand integer NOT NULL,
  delta_reserved integer NOT NULL,
  on_hand_before integer NOT NULL CHECK (on_hand_before BETWEEN 0 AND 2147483647),
  on_hand_after integer NOT NULL CHECK (on_hand_after BETWEEN 0 AND 2147483647),
  reserved_before integer NOT NULL CHECK (reserved_before BETWEEN 0 AND on_hand_before),
  reserved_after integer NOT NULL CHECK (reserved_after BETWEEN 0 AND on_hand_after),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 3 AND 500),
  actor_type text NOT NULL CHECK (actor_type IN ('seller', 'system')),
  actor_seller_id uuid REFERENCES sellers(id) ON DELETE RESTRICT,
  reference_type text,
  reference_id uuid,
  idempotency_key uuid NOT NULL UNIQUE,
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_movements_actor_check CHECK (
    (actor_type = 'seller' AND actor_seller_id IS NOT NULL)
    OR (actor_type = 'system' AND actor_seller_id IS NULL)
  ),
  CONSTRAINT stock_movements_quantity_math_check CHECK (
    on_hand_after = on_hand_before + delta_on_hand
    AND reserved_after = reserved_before + delta_reserved
  ),
  CONSTRAINT stock_movements_type_delta_check CHECK (
    (
      movement_type IN ('initial', 'receipt', 'correction', 'return')
      AND delta_reserved = 0
    )
    OR (
      movement_type IN ('reservation', 'release')
      AND delta_on_hand = 0
    )
    OR (
      movement_type = 'sale'
      AND delta_on_hand < 0
      AND delta_on_hand = delta_reserved
    )
  ),
  CONSTRAINT stock_movements_initial_check CHECK (
    movement_type != 'initial'
    OR (
      actor_type = 'system'
      AND on_hand_before = 0
      AND on_hand_after = 0
      AND reserved_before = 0
      AND reserved_after = 0
    )
  )
);
CREATE INDEX stock_movements_inventory_created_idx
  ON stock_movements (inventory_item_id, created_at DESC, id DESC);

CREATE TABLE inventory_threshold_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL
    REFERENCES inventory_items(id) ON DELETE RESTRICT,
  threshold_before integer NOT NULL CHECK (threshold_before BETWEEN 0 AND 2147483647),
  threshold_after integer NOT NULL CHECK (threshold_after BETWEEN 0 AND 2147483647),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 3 AND 500),
  actor_seller_id uuid NOT NULL REFERENCES sellers(id) ON DELETE RESTRICT,
  idempotency_key uuid NOT NULL UNIQUE,
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (threshold_before >= 0)
);
CREATE INDEX inventory_threshold_events_item_created_idx
  ON inventory_threshold_events (inventory_item_id, created_at DESC, id DESC);

CREATE FUNCTION prevent_inventory_history_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Inventory history is append-only.';
  RETURN NULL;
END
$$;

CREATE TRIGGER stock_movements_append_only
  BEFORE UPDATE OR DELETE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION prevent_inventory_history_mutation();
CREATE TRIGGER inventory_threshold_events_append_only
  BEFORE UPDATE OR DELETE ON inventory_threshold_events
  FOR EACH ROW EXECUTE FUNCTION prevent_inventory_history_mutation();
CREATE TRIGGER stock_movements_no_truncate
  BEFORE TRUNCATE ON stock_movements
  FOR EACH STATEMENT EXECUTE FUNCTION prevent_inventory_history_mutation();
CREATE TRIGGER inventory_threshold_events_no_truncate
  BEFORE TRUNCATE ON inventory_threshold_events
  FOR EACH STATEMENT EXECUTE FUNCTION prevent_inventory_history_mutation();

WITH created_variants AS (
  INSERT INTO product_variants (store_id, product_id, label, is_default)
  SELECT store_id, id, 'Standard', true
    FROM products
  ON CONFLICT (product_id) WHERE is_default = true DO NOTHING
  RETURNING id, product_id
),
created_inventory AS (
  INSERT INTO inventory_items (variant_id)
  SELECT id FROM created_variants
  ON CONFLICT (variant_id) DO NOTHING
  RETURNING id, variant_id
)
INSERT INTO stock_movements (
  inventory_item_id,
  movement_type,
  delta_on_hand,
  delta_reserved,
  on_hand_before,
  on_hand_after,
  reserved_before,
  reserved_after,
  reason,
  actor_type,
  idempotency_key,
  request_hash
)
SELECT
  inventory.id,
  'initial',
  0,
  0,
  0,
  0,
  0,
  0,
  'Migration initiale : aucune quantité historique fiable',
  'system',
  gen_random_uuid(),
  repeat('0', 64)
FROM created_inventory inventory;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM products product
      LEFT JOIN product_variants variant
        ON variant.product_id = product.id AND variant.is_default = true
      LEFT JOIN inventory_items inventory
        ON inventory.variant_id = variant.id
      LEFT JOIN stock_movements movement
        ON movement.inventory_item_id = inventory.id
       AND movement.movement_type = 'initial'
     WHERE variant.id IS NULL OR inventory.id IS NULL OR movement.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Inventory migration did not create a default variant, inventory, and initial movement for every product.';
  END IF;
END
$$;
