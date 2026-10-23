ALTER TABLE accounts
  ADD COLUMN phone_e164 text,
  ADD COLUMN phone_verified_at timestamptz,
  ADD CONSTRAINT accounts_phone_e164_format CHECK (
    phone_e164 IS NULL OR phone_e164 ~ '^\+237[0-9]{9}$'
  ),
  ADD CONSTRAINT accounts_phone_verification_pair CHECK (
    phone_verified_at IS NULL OR phone_e164 IS NOT NULL
  );

UPDATE accounts account
   SET phone_e164 = normalized.phone_e164
  FROM (
    SELECT seller.id,
           CASE
             WHEN cleaned.phone ~ '^\+237[0-9]{9}$' THEN cleaned.phone
             WHEN cleaned.phone ~ '^237[0-9]{9}$' THEN '+' || cleaned.phone
             WHEN cleaned.phone ~ '^[0-9]{9}$' THEN '+237' || cleaned.phone
             ELSE NULL
           END AS phone_e164
      FROM sellers seller
      JOIN stores store ON store.seller_id = seller.id
      CROSS JOIN LATERAL (
        SELECT regexp_replace(store.phone, '[^0-9+]', '', 'g') AS phone
      ) cleaned
  ) normalized
 WHERE account.id = normalized.id
   AND normalized.phone_e164 IS NOT NULL;

CREATE UNIQUE INDEX accounts_verified_phone_unique
  ON accounts (phone_e164)
  WHERE phone_verified_at IS NOT NULL;

CREATE TABLE customer_verification_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose text NOT NULL CHECK (purpose IN ('registration', 'phone_update')),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  registration_allowed boolean NOT NULL DEFAULT true,
  email text,
  full_name text,
  password_hash text,
  phone_e164 text NOT NULL CHECK (phone_e164 ~ '^\+237[0-9]{9}$'),
  code_hash text NOT NULL CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  delivery_status text NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  consented_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  CONSTRAINT customer_verification_challenge_shape CHECK (
    (
      purpose = 'registration'
      AND (
        (
          verified_at IS NULL
          AND email IS NOT NULL
          AND full_name IS NOT NULL
          AND password_hash IS NOT NULL
        )
        OR (
          verified_at IS NOT NULL
          AND email IS NULL
          AND full_name IS NULL
          AND password_hash IS NULL
        )
      )
    )
    OR (
      purpose = 'phone_update'
      AND account_id IS NOT NULL
      AND email IS NULL
      AND full_name IS NULL
      AND password_hash IS NULL
    )
  )
);

CREATE INDEX customer_verification_phone_created_idx
  ON customer_verification_challenges (phone_e164, created_at DESC);
CREATE INDEX customer_verification_email_created_idx
  ON customer_verification_challenges (email, created_at DESC)
  WHERE email IS NOT NULL;
CREATE INDEX customer_verification_account_idx
  ON customer_verification_challenges (account_id, created_at DESC)
  WHERE account_id IS NOT NULL;
