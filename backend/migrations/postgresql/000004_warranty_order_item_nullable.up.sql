-- Make order_item_id nullable for manually created warranties (not from orders)
ALTER TABLE warranties ALTER COLUMN order_item_id DROP NOT NULL;
