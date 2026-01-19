-- Add quantity and notes columns to shopping_list_items
ALTER TABLE shopping_list_items 
ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1,
ADD COLUMN notes TEXT;