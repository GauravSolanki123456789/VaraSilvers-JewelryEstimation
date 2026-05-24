-- Gifting metal type: fixed-price products (PV stock, KC sync fixedPrice)
ALTER TABLE products ADD COLUMN IF NOT EXISTS fixed_price DECIMAL(12,2) DEFAULT 0;
