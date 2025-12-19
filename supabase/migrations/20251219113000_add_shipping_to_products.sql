-- Migration to add shipping info to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_included BOOLEAN DEFAULT false;

COMMENT ON COLUMN products.shipping_cost IS 'Additional shipping cost for the product';
COMMENT ON COLUMN products.shipping_included IS 'Whether shipping is included in the product price';
