ALTER TABLE products
  ADD COLUMN image_data bytea,
  ADD COLUMN image_mime_type text,
  ADD CONSTRAINT products_image_size_check
    CHECK (image_data IS NULL OR octet_length(image_data) <= 3145728),
  ADD CONSTRAINT products_image_type_check
    CHECK (image_mime_type IS NULL OR image_mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  ADD CONSTRAINT products_image_pair_check
    CHECK ((image_data IS NULL) = (image_mime_type IS NULL));
