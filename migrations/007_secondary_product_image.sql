-- Optional secondary catalogue image per product (ERP PostgreSQL).
-- Matches application column: products.secondary_image_url

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'products'
          AND column_name = 'secondary_image_url'
    ) THEN
        ALTER TABLE products ADD COLUMN secondary_image_url TEXT;
        RAISE NOTICE 'Added products.secondary_image_url';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_secondary_image_url
    ON products (secondary_image_url)
    WHERE secondary_image_url IS NOT NULL;
