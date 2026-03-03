# 🗄️ Database Design - Zplus POS

## 1. Database Strategy

### Phân chia dữ liệu theo database

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DATABASE ARCHITECTURE                             │
├─────────────────────┬─────────────────────┬─────────────────────────┤
│    PostgreSQL       │     MongoDB         │      Redis              │
│    (Primary)        │     (Secondary)     │      (Cache)            │
├─────────────────────┼─────────────────────┼─────────────────────────┤
│ • Users/Roles       │ • Audit Logs        │ • Session tokens        │
│ • Products          │ • Activity Logs     │ • Cart data             │
│ • Categories        │ • Product metadata  │ • Inventory counters    │
│ • Orders/OrderItems │ • Warranty history  │ • Rate limiting         │
│ • Inventory         │ • Notifications     │ • Real-time stock       │
│ • Warranty records  │ • File references   │ • User permissions      │
│ • Suppliers         │ • Search index data │ • Frequently accessed   │
│ • Customers         │ • Report snapshots  │   product data          │
│ • Payments          │ • Email templates   │ • POS session state     │
│ • Stores/Branches   │                     │ • Pub/Sub channels      │
└─────────────────────┴─────────────────────┴─────────────────────────┘
```

---

## 2. PostgreSQL Schema

### 2.1 Core Tables - Entity Relationship

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   stores     │     │   users      │     │   roles          │
│──────────────│     │──────────────│     │──────────────────│
│ id (PK)      │◄───┐│ id (PK)      │────►│ id (PK)          │
│ name         │    ││ store_id(FK) │     │ name             │
│ address      │    ││ role_id (FK) │     │ permissions      │
│ phone        │    ││ username     │     │ description      │
│ email        │    ││ password_hash│     └──────────────────┘
│ status       │    ││ full_name    │
│ settings     │    ││ email        │
│ created_at   │    ││ status       │
│ updated_at   │    ││ created_at   │
└──────────────┘    │└──────────────┘
                    │
┌──────────────┐    │  ┌──────────────┐     ┌──────────────────┐
│  categories  │    │  │  products    │     │ product_variants │
│──────────────│    │  │──────────────│     │──────────────────│
│ id (PK)      │◄──┐│  │ id (PK)      │────►│ id (PK)          │
│ parent_id(FK)│   ││  │ category_id  │     │ product_id (FK)  │
│ name         │   ││  │ store_id(FK) │     │ sku              │
│ slug         │   ││  │ name         │     │ barcode          │
│ image_url    │   ││  │ slug         │     │ name             │
│ sort_order   │   ││  │ description  │     │ price            │
│ status       │   ││  │ brand        │     │ cost_price       │
│ created_at   │   ││  │ status       │     │ attributes (JSON)│
└──────────────┘   ││  │ warranty_dur │     │ image_url        │
                   ││  │ created_at   │     │ weight           │
                   ││  │ updated_at   │     │ status           │
                   ││  └──────────────┘     │ created_at       │
                   ││                       └──────────────────┘
                   ││                              │
                   ││  ┌──────────────────────┐    │
                   ││  │   inventory          │    │
                   ││  │──────────────────────│    │
                   ││  │ id (PK)              │◄───┘
                   ││  │ variant_id (FK)      │
                   │└─►│ store_id (FK)        │
                   │   │ quantity             │
                   │   │ reserved_qty         │
                   │   │ reorder_level        │
                   │   │ reorder_qty          │
                   │   │ location             │
                   │   │ last_counted_at      │
                   │   │ updated_at           │
                   │   └──────────────────────┘
                   │
                   │   ┌──────────────────────┐     ┌─────────────────────┐
                   │   │    orders            │     │   order_items       │
                   │   │──────────────────────│     │─────────────────────│
                   │   │ id (PK)              │────►│ id (PK)             │
                   │   │ store_id (FK)        │     │ order_id (FK)       │
                   │   │ customer_id (FK)     │     │ variant_id (FK)     │
                   │   │ user_id (FK)         │     │ product_name        │
                   │   │ order_number         │     │ sku                 │
                   │   │ status               │     │ quantity            │
                   │   │ subtotal             │     │ unit_price          │
                   │   │ tax_amount           │     │ discount_amount     │
                   │   │ discount_amount      │     │ tax_amount          │
                   └──►│ total_amount         │     │ total               │
                       │ payment_method       │     │ warranty_id (FK)    │
                       │ payment_status       │     │ notes               │
                       │ notes                │     └─────────────────────┘
                       │ created_at           │
                       │ updated_at           │
                       └──────────────────────┘
```

### 2.2 Detailed Table Definitions

#### stores
```sql
CREATE TABLE stores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(50) UNIQUE NOT NULL,
    address         TEXT,
    city            VARCHAR(100),
    district        VARCHAR(100),
    ward            VARCHAR(100),
    phone           VARCHAR(20),
    email           VARCHAR(255),
    tax_code        VARCHAR(50),
    logo_url        VARCHAR(500),
    settings        JSONB DEFAULT '{}',
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stores_status ON stores(status);
CREATE INDEX idx_stores_code ON stores(code);
```

#### users
```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id),
    role_id         UUID NOT NULL REFERENCES roles(id),
    username        VARCHAR(100) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(20),
    avatar_url      VARCHAR(500),
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'locked')),
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_store_id ON users(store_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
```

#### roles
```sql
CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID REFERENCES stores(id),
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    permissions     JSONB NOT NULL DEFAULT '[]',
    is_system       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, name)
);
```

#### categories
```sql
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id),
    parent_id       UUID REFERENCES categories(id),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL,
    description     TEXT,
    image_url       VARCHAR(500),
    sort_order      INTEGER DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, slug)
);

CREATE INDEX idx_categories_store ON categories(store_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);
```

#### products
```sql
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id),
    category_id     UUID REFERENCES categories(id),
    name            VARCHAR(500) NOT NULL,
    slug            VARCHAR(500) NOT NULL,
    description     TEXT,
    brand           VARCHAR(255),
    manufacturer    VARCHAR(255),
    warranty_months INTEGER DEFAULT 0,
    tags            TEXT[] DEFAULT '{}',
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    metadata_id     VARCHAR(50),  -- MongoDB reference for extended metadata
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, slug)
);

CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_name_gin ON products USING gin(to_tsvector('vietnamese', name));
CREATE INDEX idx_products_tags ON products USING gin(tags);
```

#### product_variants
```sql
CREATE TABLE product_variants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku             VARCHAR(100) UNIQUE NOT NULL,
    barcode         VARCHAR(100) UNIQUE,
    name            VARCHAR(500) NOT NULL,
    price           DECIMAL(15,2) NOT NULL CHECK (price >= 0),
    cost_price      DECIMAL(15,2) DEFAULT 0 CHECK (cost_price >= 0),
    compare_price   DECIMAL(15,2),
    attributes      JSONB DEFAULT '{}',  -- {"color": "Red", "size": "XL"}
    image_url       VARCHAR(500),
    weight          DECIMAL(10,3),
    weight_unit     VARCHAR(10) DEFAULT 'kg',
    is_default      BOOLEAN DEFAULT FALSE,
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_barcode ON product_variants(barcode);
```

#### inventory
```sql
CREATE TABLE inventory (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id      UUID NOT NULL REFERENCES product_variants(id),
    store_id        UUID NOT NULL REFERENCES stores(id),
    quantity         INTEGER NOT NULL DEFAULT 0,
    reserved_qty    INTEGER NOT NULL DEFAULT 0,
    available_qty   INTEGER GENERATED ALWAYS AS (quantity - reserved_qty) STORED,
    reorder_level   INTEGER DEFAULT 10,
    reorder_qty     INTEGER DEFAULT 50,
    location        VARCHAR(100),  -- Shelf/Bin location
    batch_number    VARCHAR(100),
    expiry_date     DATE,
    last_counted_at TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(variant_id, store_id)
);

CREATE INDEX idx_inventory_variant ON inventory(variant_id);
CREATE INDEX idx_inventory_store ON inventory(store_id);
CREATE INDEX idx_inventory_low_stock ON inventory(quantity) WHERE quantity <= reorder_level;
```

#### inventory_movements
```sql
CREATE TABLE inventory_movements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id      UUID NOT NULL REFERENCES product_variants(id),
    store_id        UUID NOT NULL REFERENCES stores(id),
    type            VARCHAR(30) NOT NULL CHECK (type IN (
                        'purchase', 'sale', 'return', 'adjustment',
                        'transfer_in', 'transfer_out', 'damage',
                        'warranty_out', 'warranty_in', 'stocktake'
                    )),
    quantity         INTEGER NOT NULL,  -- positive for in, negative for out
    reference_type  VARCHAR(50),  -- 'order', 'purchase_order', 'warranty', 'stocktake'
    reference_id    UUID,
    cost_price      DECIMAL(15,2),
    notes           TEXT,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_movements_variant ON inventory_movements(variant_id);
CREATE INDEX idx_movements_store ON inventory_movements(store_id);
CREATE INDEX idx_movements_type ON inventory_movements(type);
CREATE INDEX idx_movements_created ON inventory_movements(created_at);
CREATE INDEX idx_movements_reference ON inventory_movements(reference_type, reference_id);
```

#### customers
```sql
CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id),
    code            VARCHAR(50),
    full_name       VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    email           VARCHAR(255),
    address         TEXT,
    city            VARCHAR(100),
    district        VARCHAR(100),
    ward            VARCHAR(100),
    tax_code        VARCHAR(50),
    company_name    VARCHAR(255),
    date_of_birth   DATE,
    gender          VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    loyalty_points  INTEGER DEFAULT 0,
    total_spent     DECIMAL(15,2) DEFAULT 0,
    total_orders    INTEGER DEFAULT 0,
    tags            TEXT[] DEFAULT '{}',
    notes           TEXT,
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_store ON customers(store_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name ON customers USING gin(to_tsvector('vietnamese', full_name));
```

#### orders
```sql
CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id),
    customer_id     UUID REFERENCES customers(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    order_number    VARCHAR(50) UNIQUE NOT NULL,
    order_type      VARCHAR(20) DEFAULT 'pos' CHECK (order_type IN ('pos', 'online', 'phone')),
    status          VARCHAR(30) DEFAULT 'completed' CHECK (status IN (
                        'draft', 'pending', 'confirmed', 'processing',
                        'completed', 'cancelled', 'refunded', 'partially_refunded'
                    )),
    subtotal        DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_type   VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value  DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_rate        DECIMAL(5,2) DEFAULT 0,
    tax_amount      DECIMAL(15,2) DEFAULT 0,
    shipping_fee    DECIMAL(15,2) DEFAULT 0,
    total_amount    DECIMAL(15,2) NOT NULL DEFAULT 0,
    paid_amount     DECIMAL(15,2) DEFAULT 0,
    change_amount   DECIMAL(15,2) DEFAULT 0,
    payment_method  VARCHAR(30) CHECK (payment_method IN (
                        'cash', 'card', 'bank_transfer', 'e_wallet', 'mixed'
                    )),
    payment_status  VARCHAR(20) DEFAULT 'paid' CHECK (payment_status IN (
                        'pending', 'paid', 'partially_paid', 'refunded'
                    )),
    notes           TEXT,
    pos_session_id  UUID,
    receipt_printed BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
```

#### order_items
```sql
CREATE TABLE order_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    variant_id      UUID NOT NULL REFERENCES product_variants(id),
    product_name    VARCHAR(500) NOT NULL,  -- Snapshot at time of sale
    sku             VARCHAR(100) NOT NULL,
    barcode         VARCHAR(100),
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    unit_price      DECIMAL(15,2) NOT NULL,
    cost_price      DECIMAL(15,2) DEFAULT 0,
    discount_type   VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value  DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount      DECIMAL(15,2) DEFAULT 0,
    total           DECIMAL(15,2) NOT NULL,
    warranty_id     UUID REFERENCES warranties(id),
    serial_numbers  TEXT[] DEFAULT '{}',
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_variant ON order_items(variant_id);
```

#### payments
```sql
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id),
    store_id        UUID NOT NULL REFERENCES stores(id),
    method          VARCHAR(30) NOT NULL CHECK (method IN (
                        'cash', 'card', 'bank_transfer', 'e_wallet', 'voucher'
                    )),
    amount          DECIMAL(15,2) NOT NULL,
    reference_code  VARCHAR(255),  -- Transaction ID from payment gateway
    bank_name       VARCHAR(100),
    account_number  VARCHAR(50),
    status          VARCHAR(20) DEFAULT 'completed' CHECK (status IN (
                        'pending', 'completed', 'failed', 'refunded'
                    )),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_store ON payments(store_id);
```

#### suppliers
```sql
CREATE TABLE suppliers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id),
    code            VARCHAR(50),
    name            VARCHAR(255) NOT NULL,
    contact_person  VARCHAR(255),
    phone           VARCHAR(20),
    email           VARCHAR(255),
    address         TEXT,
    tax_code        VARCHAR(50),
    bank_account    VARCHAR(50),
    bank_name       VARCHAR(100),
    payment_terms   INTEGER DEFAULT 30,  -- days
    notes           TEXT,
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_store ON suppliers(store_id);
```

#### purchase_orders
```sql
CREATE TABLE purchase_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id),
    supplier_id     UUID NOT NULL REFERENCES suppliers(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    po_number       VARCHAR(50) UNIQUE NOT NULL,
    status          VARCHAR(30) DEFAULT 'draft' CHECK (status IN (
                        'draft', 'pending', 'approved', 'ordered',
                        'partially_received', 'received', 'cancelled'
                    )),
    subtotal        DECIMAL(15,2) DEFAULT 0,
    tax_amount      DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    shipping_fee    DECIMAL(15,2) DEFAULT 0,
    total_amount    DECIMAL(15,2) DEFAULT 0,
    expected_date   DATE,
    received_date   TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_po_store ON purchase_orders(store_id);
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
```

#### purchase_order_items
```sql
CREATE TABLE purchase_order_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id           UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    variant_id      UUID NOT NULL REFERENCES product_variants(id),
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    received_qty    INTEGER DEFAULT 0,
    unit_cost       DECIMAL(15,2) NOT NULL,
    total           DECIMAL(15,2) NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_po_items_po ON purchase_order_items(po_id);
```

#### warranties
```sql
CREATE TABLE warranties (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id),
    customer_id     UUID REFERENCES customers(id),
    order_id        UUID REFERENCES orders(id),
    order_item_id   UUID REFERENCES order_items(id),
    variant_id      UUID NOT NULL REFERENCES product_variants(id),
    warranty_code   VARCHAR(50) UNIQUE NOT NULL,
    serial_number   VARCHAR(100),
    product_name    VARCHAR(500) NOT NULL,
    purchase_date   TIMESTAMPTZ NOT NULL,
    expiry_date     TIMESTAMPTZ NOT NULL,
    warranty_months INTEGER NOT NULL,
    status          VARCHAR(30) DEFAULT 'active' CHECK (status IN (
                        'active', 'expired', 'voided', 'claimed'
                    )),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_warranties_store ON warranties(store_id);
CREATE INDEX idx_warranties_customer ON warranties(customer_id);
CREATE INDEX idx_warranties_code ON warranties(warranty_code);
CREATE INDEX idx_warranties_serial ON warranties(serial_number);
CREATE INDEX idx_warranties_status ON warranties(status);
CREATE INDEX idx_warranties_expiry ON warranties(expiry_date);
```

#### warranty_claims
```sql
CREATE TABLE warranty_claims (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warranty_id     UUID NOT NULL REFERENCES warranties(id),
    store_id        UUID NOT NULL REFERENCES stores(id),
    claim_number    VARCHAR(50) UNIQUE NOT NULL,
    customer_id     UUID REFERENCES customers(id),
    issue_description TEXT NOT NULL,
    issue_category  VARCHAR(50),  -- 'hardware', 'software', 'physical_damage', 'other'
    diagnosis       TEXT,
    resolution      TEXT,
    resolution_type VARCHAR(30) CHECK (resolution_type IN (
                        'repair', 'replace', 'refund', 'rejected', 'pending'
                    )),
    status          VARCHAR(30) DEFAULT 'received' CHECK (status IN (
                        'received', 'inspecting', 'in_repair', 'waiting_parts',
                        'repaired', 'replaced', 'rejected', 'returned', 'closed'
                    )),
    received_date   TIMESTAMPTZ DEFAULT NOW(),
    estimated_date  TIMESTAMPTZ,
    completed_date  TIMESTAMPTZ,
    returned_date   TIMESTAMPTZ,
    repair_cost     DECIMAL(15,2) DEFAULT 0,
    parts_used      JSONB DEFAULT '[]',
    received_by     UUID REFERENCES users(id),
    assigned_to     UUID REFERENCES users(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_claims_warranty ON warranty_claims(warranty_id);
CREATE INDEX idx_claims_store ON warranty_claims(store_id);
CREATE INDEX idx_claims_status ON warranty_claims(status);
CREATE INDEX idx_claims_number ON warranty_claims(claim_number);
```

#### pos_sessions
```sql
CREATE TABLE pos_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    terminal_id     VARCHAR(50),
    opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(15,2),
    total_sales     DECIMAL(15,2) DEFAULT 0,
    total_refunds   DECIMAL(15,2) DEFAULT 0,
    total_orders    INTEGER DEFAULT 0,
    cash_payments   DECIMAL(15,2) DEFAULT 0,
    card_payments   DECIMAL(15,2) DEFAULT 0,
    other_payments  DECIMAL(15,2) DEFAULT 0,
    difference      DECIMAL(15,2),  -- closing - expected
    status          VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_at       TIMESTAMPTZ DEFAULT NOW(),
    closed_at       TIMESTAMPTZ,
    notes           TEXT
);

CREATE INDEX idx_pos_sessions_store ON pos_sessions(store_id);
CREATE INDEX idx_pos_sessions_user ON pos_sessions(user_id);
CREATE INDEX idx_pos_sessions_status ON pos_sessions(status);
```

#### stocktakes
```sql
CREATE TABLE stocktakes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    stocktake_number VARCHAR(50) UNIQUE NOT NULL,
    status          VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
                        'draft', 'in_progress', 'completed', 'cancelled'
                    )),
    notes           TEXT,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stocktake_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stocktake_id    UUID NOT NULL REFERENCES stocktakes(id) ON DELETE CASCADE,
    variant_id      UUID NOT NULL REFERENCES product_variants(id),
    system_qty      INTEGER NOT NULL,
    counted_qty     INTEGER,
    difference      INTEGER GENERATED ALWAYS AS (counted_qty - system_qty) STORED,
    notes           TEXT,
    counted_at      TIMESTAMPTZ,
    counted_by      UUID REFERENCES users(id)
);

CREATE INDEX idx_stocktake_items_stocktake ON stocktake_items(stocktake_id);
```

---

## 3. MongoDB Collections

### 3.1 audit_logs
```json
{
    "_id": "ObjectId",
    "store_id": "uuid-string",
    "user_id": "uuid-string",
    "action": "create|update|delete|login|logout|export|print",
    "resource": "product|order|inventory|warranty|user|customer",
    "resource_id": "uuid-string",
    "changes": {
        "before": { /* previous state */ },
        "after": { /* new state */ }
    },
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "metadata": {},
    "created_at": "ISODate"
}

// Indexes
db.audit_logs.createIndex({ "store_id": 1, "created_at": -1 })
db.audit_logs.createIndex({ "user_id": 1, "created_at": -1 })
db.audit_logs.createIndex({ "resource": 1, "resource_id": 1 })
db.audit_logs.createIndex({ "created_at": 1 }, { expireAfterSeconds: 157680000 }) // 5 years TTL
```

### 3.2 product_metadata
```json
{
    "_id": "ObjectId",
    "product_id": "uuid-string",
    "store_id": "uuid-string",
    "specifications": {
        "dimensions": { "length": 10, "width": 5, "height": 3, "unit": "cm" },
        "weight": { "value": 500, "unit": "g" },
        "material": "Aluminum",
        "color_options": ["Black", "Silver", "Gold"],
        "technical_specs": [
            { "key": "Processor", "value": "Snapdragon 8 Gen 3" },
            { "key": "RAM", "value": "12GB" },
            { "key": "Storage", "value": "256GB" }
        ]
    },
    "images": [
        {
            "url": "https://storage.example.com/products/img1.jpg",
            "alt": "Front view",
            "is_primary": true,
            "sort_order": 0
        }
    ],
    "documents": [
        {
            "name": "User Manual",
            "url": "https://storage.example.com/docs/manual.pdf",
            "type": "pdf"
        }
    ],
    "seo": {
        "meta_title": "...",
        "meta_description": "...",
        "keywords": ["..."]
    },
    "warranty_terms": "Chi tiết điều khoản bảo hành...",
    "updated_at": "ISODate"
}
```

### 3.3 warranty_history
```json
{
    "_id": "ObjectId",
    "warranty_id": "uuid-string",
    "claim_id": "uuid-string",
    "store_id": "uuid-string",
    "events": [
        {
            "type": "received",
            "description": "Nhận máy từ khách hàng",
            "user_id": "uuid-string",
            "user_name": "Nguyễn Văn A",
            "photos": ["url1", "url2"],
            "notes": "Máy có vết trầy nhẹ bên ngoài",
            "created_at": "ISODate"
        },
        {
            "type": "inspected",
            "description": "Đã kiểm tra, lỗi mainboard",
            "user_id": "uuid-string",
            "user_name": "Trần Văn B",
            "diagnosis_details": {
                "issue": "Mainboard failure",
                "severity": "critical",
                "repairable": true
            },
            "created_at": "ISODate"
        }
    ],
    "customer_communications": [
        {
            "type": "sms|email|phone",
            "content": "Thông báo tình trạng bảo hành...",
            "sent_at": "ISODate",
            "sent_by": "uuid-string"
        }
    ],
    "created_at": "ISODate",
    "updated_at": "ISODate"
}
```

### 3.4 notifications
```json
{
    "_id": "ObjectId",
    "store_id": "uuid-string",
    "user_id": "uuid-string",
    "type": "low_stock|warranty_expiry|order_update|system",
    "title": "Sắp hết hàng: iPhone 15 Pro Max",
    "message": "Số lượng tồn kho còn 5, dưới mức tối thiểu 10",
    "severity": "info|warning|error|critical",
    "data": {
        "variant_id": "uuid-string",
        "current_qty": 5,
        "reorder_level": 10
    },
    "read": false,
    "read_at": null,
    "created_at": "ISODate"
}

db.notifications.createIndex({ "user_id": 1, "read": 1, "created_at": -1 })
db.notifications.createIndex({ "created_at": 1 }, { expireAfterSeconds: 7776000 }) // 90 days TTL
```

### 3.5 report_snapshots
```json
{
    "_id": "ObjectId",
    "store_id": "uuid-string",
    "report_type": "daily_sales|monthly_inventory|warranty_summary",
    "period": {
        "start": "ISODate",
        "end": "ISODate",
        "type": "daily|weekly|monthly|yearly"
    },
    "data": {
        "total_revenue": 150000000,
        "total_orders": 245,
        "top_products": [...],
        "payment_breakdown": {...},
        "category_breakdown": {...}
    },
    "generated_by": "uuid-string|system",
    "generated_at": "ISODate"
}
```

---

## 4. Redis Data Structures

### 4.1 Session Management
```
# User session
SET session:{session_id} {user_json} EX 86400

# Active POS sessions
HSET pos:session:{session_id} user_id {uuid} store_id {uuid} terminal {id} opened_at {timestamp}
```

### 4.2 Inventory Cache
```
# Real-time stock count
HSET inventory:{store_id} {variant_id} {quantity}

# Low stock alerts
SADD low_stock:{store_id} {variant_id}

# Reserved stock (pending orders)
HINCRBY reserved:{store_id} {variant_id} {quantity}
```

### 4.3 Cart / Draft Orders
```
# Shopping cart
HSET cart:{session_id} items {json_array} customer_id {uuid} discount {json} updated_at {timestamp}
EXPIRE cart:{session_id} 86400
```

### 4.4 Rate Limiting
```
# API rate limiting
SET ratelimit:{user_id}:{endpoint} {count} EX 60
```

### 4.5 Caching
```
# Product cache
SET cache:product:{product_id} {json} EX 3600

# Category tree cache
SET cache:categories:{store_id} {json} EX 1800

# Dashboard stats cache
SET cache:dashboard:{store_id}:{date} {json} EX 300
```

### 4.6 Pub/Sub Channels
```
# Real-time notifications
PUBLISH notifications:{store_id} {notification_json}

# Inventory updates
PUBLISH inventory:update:{store_id} {movement_json}

# Order events
PUBLISH orders:{store_id} {order_event_json}
```

---

## 5. Database Migration Strategy

```
migrations/
├── postgresql/
│   ├── 000001_create_stores.up.sql
│   ├── 000001_create_stores.down.sql
│   ├── 000002_create_roles.up.sql
│   ├── 000002_create_roles.down.sql
│   ├── 000003_create_users.up.sql
│   ├── ...
│   ├── 000010_create_warranties.up.sql
│   ├── 000010_create_warranties.down.sql
│   ├── 000011_create_warranty_claims.up.sql
│   ├── 000011_create_warranty_claims.down.sql
│   └── 000012_seed_default_data.up.sql
└── mongodb/
    └── init_indexes.js
```
