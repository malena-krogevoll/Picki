-- Add product_data column to store actual product information
ALTER TABLE shopping_list_items
ADD COLUMN product_data jsonb DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN shopping_list_items.product_data IS 'Stores product details (ean, name, brand, price, image, novaScore, store) when a specific product is selected. NULL for free-text items.';