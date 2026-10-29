ALTER TABLE orders
  DROP CONSTRAINT orders_status_check,
  ADD CONSTRAINT orders_status_check CHECK (status IN (
    'awaiting_payment','awaiting_vendor_confirmation','confirmed','preparing','handed_to_carrier','in_transit','delivered','cancelled','delivery_failed','returned','disputed'
  ));

ALTER TABLE seller_orders
  DROP CONSTRAINT seller_orders_status_check,
  ADD CONSTRAINT seller_orders_status_check CHECK (status IN (
    'awaiting_payment','awaiting_vendor_confirmation','confirmed','preparing','handed_to_carrier','in_transit','delivered','cancelled','delivery_failed','returned','disputed'
  ));

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (provider IN ('mtn_momo')),
  provider_reference uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','successful','failed','expired','cancelled')),
  amount_xaf bigint NOT NULL CHECK (amount_xaf > 0 AND amount_xaf <= 2147483647),
  payer_phone text NOT NULL,
  provider_status text,
  idempotency_key uuid NOT NULL UNIQUE,
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE INDEX payments_status_updated_idx ON payments (status, updated_at DESC);

CREATE FUNCTION set_updated_at_mtn_payment() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$;

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_mtn_payment();
