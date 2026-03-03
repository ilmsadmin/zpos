-- Seed default roles
INSERT INTO roles (id, name, display_name, description, permissions, is_system) VALUES
(uuid_generate_v4(), 'super_admin', 'Super Admin', 'Full system access', '["*"]'::jsonb, true),
(uuid_generate_v4(), 'store_admin', 'Store Admin', 'Full store management access', 
    '["users:read","users:create","users:update","users:delete","products:read","products:create","products:update","products:delete","inventory:read","inventory:update","inventory:import","inventory:export","inventory:stocktake","orders:read","orders:create","orders:update","orders:cancel","orders:refund","pos:access","pos:discount","customers:read","customers:create","customers:update","customers:delete","suppliers:read","suppliers:create","suppliers:update","warranties:read","warranties:create","warranties:update","reports:read","settings:read","settings:update","stores:read","stores:update"]'::jsonb, true),
(uuid_generate_v4(), 'manager', 'Manager', 'Store manager with most permissions',
    '["users:read","products:read","products:create","products:update","inventory:read","inventory:update","inventory:import","inventory:export","inventory:stocktake","orders:read","orders:create","orders:update","orders:cancel","pos:access","pos:discount","customers:read","customers:create","customers:update","suppliers:read","suppliers:create","warranties:read","warranties:create","warranties:update","reports:read"]'::jsonb, true),
(uuid_generate_v4(), 'cashier', 'Cashier', 'POS and basic operations',
    '["products:read","orders:read","orders:create","pos:access","customers:read","customers:create","warranties:read"]'::jsonb, true),
(uuid_generate_v4(), 'staff', 'Staff', 'Basic staff access',
    '["products:read","inventory:read","orders:read","customers:read","warranties:read"]'::jsonb, true),
(uuid_generate_v4(), 'technician', 'Technician', 'Warranty and technical operations',
    '["products:read","warranties:read","warranties:update","customers:read"]'::jsonb, true);
