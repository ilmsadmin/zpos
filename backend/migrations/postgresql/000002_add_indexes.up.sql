-- Indexes for performance

-- Users
CREATE INDEX idx_users_store_id ON users(store_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- Categories
CREATE INDEX idx_categories_store_id ON categories(store_id);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(store_id, slug);

-- Products
CREATE INDEX idx_products_store_id ON products(store_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_slug ON products(store_id, slug);
CREATE INDEX idx_products_deleted_at ON products(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
CREATE INDEX idx_products_brand ON products(brand) WHERE brand IS NOT NULL AND brand != '';

-- Product variants
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);
CREATE INDEX idx_product_variants_barcode ON product_variants(barcode) WHERE barcode IS NOT NULL;

-- Inventory
CREATE INDEX idx_inventory_store_id ON inventory(store_id);
CREATE INDEX idx_inventory_variant_id ON inventory(product_variant_id);
CREATE INDEX idx_inventory_low_stock ON inventory(store_id) WHERE quantity <= min_stock_level;

-- Inventory movements
CREATE INDEX idx_inv_movements_store_id ON inventory_movements(store_id);
CREATE INDEX idx_inv_movements_variant_id ON inventory_movements(product_variant_id);
CREATE INDEX idx_inv_movements_created_at ON inventory_movements(created_at);
CREATE INDEX idx_inv_movements_reference ON inventory_movements(reference_type, reference_id);

-- Customers
CREATE INDEX idx_customers_store_id ON customers(store_id);
CREATE INDEX idx_customers_phone ON customers(store_id, phone);
CREATE INDEX idx_customers_name_trgm ON customers USING GIN (full_name gin_trgm_ops);
CREATE INDEX idx_customers_deleted_at ON customers(deleted_at) WHERE deleted_at IS NULL;

-- Orders
CREATE INDEX idx_orders_store_id ON orders(store_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(store_id, status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_pos_session_id ON orders(pos_session_id);

-- Order items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_variant_id ON order_items(product_variant_id);

-- Payments
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Suppliers
CREATE INDEX idx_suppliers_store_id ON suppliers(store_id);
CREATE INDEX idx_suppliers_deleted_at ON suppliers(deleted_at) WHERE deleted_at IS NULL;

-- Purchase orders
CREATE INDEX idx_purchase_orders_store_id ON purchase_orders(store_id);
CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);

-- Warranties
CREATE INDEX idx_warranties_store_id ON warranties(store_id);
CREATE INDEX idx_warranties_customer_id ON warranties(customer_id);
CREATE INDEX idx_warranties_code ON warranties(warranty_code);
CREATE INDEX idx_warranties_status ON warranties(status);
CREATE INDEX idx_warranties_end_date ON warranties(end_date);

-- Warranty claims
CREATE INDEX idx_warranty_claims_warranty_id ON warranty_claims(warranty_id);
CREATE INDEX idx_warranty_claims_status ON warranty_claims(status);
CREATE INDEX idx_warranty_claims_store_id ON warranty_claims(store_id);

-- POS sessions
CREATE INDEX idx_pos_sessions_store_id ON pos_sessions(store_id);
CREATE INDEX idx_pos_sessions_user_id ON pos_sessions(user_id);
CREATE INDEX idx_pos_sessions_status ON pos_sessions(status);

-- Stocktakes
CREATE INDEX idx_stocktakes_store_id ON stocktakes(store_id);
CREATE INDEX idx_stocktakes_status ON stocktakes(status);
