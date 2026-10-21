CREATE TYPE seller_status_v2 AS ENUM ('pending_review', 'active', 'rejected');

ALTER TABLE sellers ALTER COLUMN status DROP DEFAULT;
ALTER TABLE sellers
  ALTER COLUMN status TYPE seller_status_v2
  USING 'pending_review'::seller_status_v2;

DROP TYPE seller_status;
ALTER TYPE seller_status_v2 RENAME TO seller_status;

ALTER TABLE sellers ALTER COLUMN status SET DEFAULT 'pending_review';
ALTER TABLE sellers ADD COLUMN rejection_reason text;

UPDATE stores SET is_public = false;
UPDATE products SET is_active = false;
