-- Revert order_item_id to NOT NULL
ALTER TABLE warranties ALTER COLUMN order_item_id SET NOT NULL;
