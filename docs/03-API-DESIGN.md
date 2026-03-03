# 🔌 API Design - Zplus POS

## 1. API Standards

### Base URL
```
Production:  https://api.zplus-pos.com/v1
Staging:     https://api-staging.zplus-pos.com/v1
Development: http://localhost:8080/api/v1
```

### Request/Response Format
- Content-Type: `application/json`
- Character encoding: `UTF-8`
- Date format: `ISO 8601` (e.g., `2026-03-03T10:30:00Z`)
- Currency: VND (integer), other currencies (decimal with 2 places)

### Standard Response Structure
```json
// Success Response
{
    "success": true,
    "data": { ... },
    "message": "Operation successful",
    "timestamp": "2026-03-03T10:30:00Z"
}

// Paginated Response
{
    "success": true,
    "data": [ ... ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 150,
        "total_pages": 8,
        "has_next": true,
        "has_prev": false
    },
    "timestamp": "2026-03-03T10:30:00Z"
}

// Error Response
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid input data",
        "details": [
            {
                "field": "email",
                "message": "Email is required"
            }
        ]
    },
    "timestamp": "2026-03-03T10:30:00Z"
}
```

### Error Codes
| HTTP Status | Error Code | Description |
|------------|-----------|-------------|
| 400 | VALIDATION_ERROR | Invalid input data |
| 400 | BAD_REQUEST | Malformed request |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 401 | TOKEN_EXPIRED | Access token expired |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists |
| 422 | UNPROCESSABLE | Business logic error |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

### Authentication
```
Authorization: Bearer <access_token>
X-Store-ID: <store_uuid>
X-Request-ID: <unique_request_id>
```

---

## 2. API Endpoints

### 2.1 Authentication (`/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Đăng nhập | ❌ |
| POST | `/auth/logout` | Đăng xuất | ✅ |
| POST | `/auth/refresh` | Refresh token | ❌ |
| POST | `/auth/change-password` | Đổi mật khẩu | ✅ |
| GET | `/auth/me` | Thông tin user hiện tại | ✅ |

#### POST /auth/login
```json
// Request
{
    "username": "admin",
    "password": "password123",
    "store_code": "STORE01"
}

// Response 200
{
    "success": true,
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIs...",
        "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
        "token_type": "Bearer",
        "expires_in": 3600,
        "user": {
            "id": "uuid",
            "username": "admin",
            "full_name": "Nguyễn Văn Admin",
            "email": "admin@store.com",
            "role": {
                "id": "uuid",
                "name": "admin",
                "permissions": ["products.read", "products.write", "orders.read", ...]
            },
            "store": {
                "id": "uuid",
                "name": "Zplus Store - Chi nhánh 1",
                "code": "STORE01"
            }
        }
    }
}
```

---

### 2.2 Users & Roles (`/users`, `/roles`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/users` | Danh sách users | users.read |
| POST | `/users` | Tạo user mới | users.write |
| GET | `/users/:id` | Chi tiết user | users.read |
| PUT | `/users/:id` | Cập nhật user | users.write |
| DELETE | `/users/:id` | Xóa user (soft delete) | users.delete |
| GET | `/roles` | Danh sách roles | roles.read |
| POST | `/roles` | Tạo role | roles.write |
| PUT | `/roles/:id` | Cập nhật role | roles.write |

---

### 2.3 Products (`/products`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/products` | Danh sách sản phẩm | products.read |
| POST | `/products` | Tạo sản phẩm | products.write |
| GET | `/products/:id` | Chi tiết sản phẩm | products.read |
| PUT | `/products/:id` | Cập nhật sản phẩm | products.write |
| DELETE | `/products/:id` | Xóa sản phẩm | products.delete |
| GET | `/products/search` | Tìm kiếm sản phẩm | products.read |
| GET | `/products/barcode/:barcode` | Tìm theo barcode | products.read |
| POST | `/products/:id/variants` | Thêm variant | products.write |
| PUT | `/products/:id/variants/:vid` | Sửa variant | products.write |
| DELETE | `/products/:id/variants/:vid` | Xóa variant | products.delete |
| POST | `/products/import` | Import từ Excel/CSV | products.import |
| GET | `/products/export` | Export ra Excel/CSV | products.export |

#### GET /products
```
Query Parameters:
- page (int, default: 1)
- limit (int, default: 20, max: 100)
- search (string) - Tìm theo tên, SKU, barcode
- category_id (uuid)
- brand (string)
- status (string: active|inactive|discontinued)
- min_price (decimal)
- max_price (decimal)
- sort_by (string: name|price|created_at|updated_at)
- sort_order (string: asc|desc)
- has_warranty (boolean)
- low_stock (boolean) - Lọc sản phẩm sắp hết hàng
```

#### POST /products
```json
// Request
{
    "name": "iPhone 15 Pro Max 256GB",
    "category_id": "uuid",
    "description": "Apple iPhone 15 Pro Max...",
    "brand": "Apple",
    "manufacturer": "Apple Inc.",
    "warranty_months": 12,
    "tags": ["smartphone", "apple", "flagship"],
    "variants": [
        {
            "name": "iPhone 15 Pro Max 256GB - Natural Titanium",
            "sku": "IP15PM-256-NT",
            "barcode": "1234567890123",
            "price": 34990000,
            "cost_price": 30000000,
            "attributes": {
                "color": "Natural Titanium",
                "storage": "256GB"
            },
            "initial_stock": 50
        },
        {
            "name": "iPhone 15 Pro Max 256GB - Blue Titanium",
            "sku": "IP15PM-256-BT",
            "barcode": "1234567890124",
            "price": 34990000,
            "cost_price": 30000000,
            "attributes": {
                "color": "Blue Titanium",
                "storage": "256GB"
            },
            "initial_stock": 30
        }
    ],
    "metadata": {
        "specifications": {
            "dimensions": { "length": 159.9, "width": 76.7, "height": 8.25, "unit": "mm" },
            "weight": { "value": 221, "unit": "g" }
        },
        "images": [
            { "url": "https://...", "alt": "Front view", "is_primary": true }
        ]
    }
}

// Response 201
{
    "success": true,
    "data": {
        "id": "uuid",
        "name": "iPhone 15 Pro Max 256GB",
        "slug": "iphone-15-pro-max-256gb",
        // ... full product object
    },
    "message": "Product created successfully"
}
```

---

### 2.4 Categories (`/categories`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/categories` | Danh sách categories (tree) | categories.read |
| POST | `/categories` | Tạo category | categories.write |
| GET | `/categories/:id` | Chi tiết category | categories.read |
| PUT | `/categories/:id` | Cập nhật category | categories.write |
| DELETE | `/categories/:id` | Xóa category | categories.delete |
| PUT | `/categories/reorder` | Sắp xếp lại thứ tự | categories.write |

---

### 2.5 Inventory (`/inventory`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/inventory` | Danh sách tồn kho | inventory.read |
| GET | `/inventory/:variant_id` | Tồn kho theo variant | inventory.read |
| PUT | `/inventory/:variant_id` | Cập nhật tồn kho | inventory.write |
| POST | `/inventory/adjust` | Điều chỉnh tồn kho | inventory.adjust |
| POST | `/inventory/transfer` | Chuyển kho | inventory.transfer |
| GET | `/inventory/movements` | Lịch sử xuất/nhập | inventory.read |
| GET | `/inventory/low-stock` | Danh sách sắp hết hàng | inventory.read |
| GET | `/inventory/valuation` | Giá trị tồn kho | inventory.report |
| GET | `/inventory/export` | Export báo cáo tồn kho | inventory.export |

#### POST /inventory/adjust
```json
// Request - Điều chỉnh tồn kho
{
    "adjustments": [
        {
            "variant_id": "uuid",
            "type": "adjustment",
            "quantity": -5,
            "reason": "Hàng hỏng, không bán được",
            "notes": "Kiểm tra ngày 03/03/2026"
        },
        {
            "variant_id": "uuid",
            "type": "adjustment",
            "quantity": 10,
            "reason": "Nhập thêm hàng",
            "cost_price": 5000000
        }
    ]
}

// Response 200
{
    "success": true,
    "data": {
        "adjustments_count": 2,
        "movements": [
            {
                "id": "uuid",
                "variant_id": "uuid",
                "type": "adjustment",
                "quantity": -5,
                "new_stock": 45
            },
            {
                "id": "uuid",
                "variant_id": "uuid",
                "type": "adjustment",
                "quantity": 10,
                "new_stock": 60
            }
        ]
    },
    "message": "Inventory adjusted successfully"
}
```

#### POST /inventory/transfer
```json
// Request - Chuyển kho giữa các chi nhánh
{
    "from_store_id": "uuid",
    "to_store_id": "uuid",
    "items": [
        {
            "variant_id": "uuid",
            "quantity": 20,
            "notes": "Chuyển hàng sang chi nhánh 2"
        }
    ],
    "notes": "Chuyển hàng theo yêu cầu #TF-001"
}
```

---

### 2.6 Orders / POS (`/orders`, `/pos`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| **POS Session** | | | |
| POST | `/pos/sessions/open` | Mở ca bán hàng | pos.session |
| POST | `/pos/sessions/close` | Đóng ca bán hàng | pos.session |
| GET | `/pos/sessions/current` | Ca hiện tại | pos.session |
| GET | `/pos/sessions/:id` | Chi tiết ca | pos.session |
| **Cart** | | | |
| GET | `/pos/cart` | Lấy giỏ hàng hiện tại | pos.sell |
| POST | `/pos/cart/items` | Thêm item vào giỏ | pos.sell |
| PUT | `/pos/cart/items/:id` | Cập nhật item | pos.sell |
| DELETE | `/pos/cart/items/:id` | Xóa item khỏi giỏ | pos.sell |
| PUT | `/pos/cart/discount` | Áp dụng giảm giá | pos.discount |
| PUT | `/pos/cart/customer` | Gán khách hàng | pos.sell |
| DELETE | `/pos/cart` | Xóa giỏ hàng | pos.sell |
| **Checkout** | | | |
| POST | `/pos/checkout` | Thanh toán | pos.sell |
| **Orders** | | | |
| GET | `/orders` | Danh sách đơn hàng | orders.read |
| GET | `/orders/:id` | Chi tiết đơn hàng | orders.read |
| POST | `/orders/:id/refund` | Hoàn trả | orders.refund |
| GET | `/orders/:id/receipt` | In hóa đơn (PDF) | orders.read |
| GET | `/orders/:id/invoice` | Xuất hóa đơn VAT | orders.read |
| GET | `/orders/export` | Export đơn hàng | orders.export |

#### POST /pos/checkout
```json
// Request
{
    "customer_id": "uuid",  // optional
    "items": [
        {
            "variant_id": "uuid",
            "quantity": 1,
            "unit_price": 34990000,
            "discount_type": "fixed",
            "discount_value": 1000000,
            "serial_numbers": ["SN123456789"],
            "notes": ""
        },
        {
            "variant_id": "uuid",
            "quantity": 2,
            "unit_price": 590000,
            "discount_type": null,
            "discount_value": 0
        }
    ],
    "discount": {
        "type": "percentage",
        "value": 5,
        "reason": "Khách VIP"
    },
    "payments": [
        {
            "method": "cash",
            "amount": 20000000
        },
        {
            "method": "bank_transfer",
            "amount": 14170000,
            "reference_code": "VCB-20260303-001",
            "bank_name": "Vietcombank"
        }
    ],
    "create_warranty": true,
    "notes": "Khách hàng VIP, tặng kèm ốp lưng",
    "print_receipt": true
}

// Response 201
{
    "success": true,
    "data": {
        "order": {
            "id": "uuid",
            "order_number": "ORD-20260303-0001",
            "status": "completed",
            "subtotal": 36170000,
            "discount_amount": 2808500,
            "tax_amount": 0,
            "total_amount": 34170000,
            "paid_amount": 34170000,
            "change_amount": 0,
            "items": [...],
            "payments": [...],
            "customer": {...},
            "created_at": "2026-03-03T10:30:00Z"
        },
        "warranties": [
            {
                "id": "uuid",
                "warranty_code": "WR-20260303-0001",
                "product_name": "iPhone 15 Pro Max 256GB - Natural Titanium",
                "serial_number": "SN123456789",
                "purchase_date": "2026-03-03",
                "expiry_date": "2027-03-03",
                "warranty_months": 12
            }
        ],
        "receipt_url": "https://api.zplus-pos.com/receipts/uuid.pdf"
    },
    "message": "Order completed successfully"
}
```

---

### 2.7 Warranties (`/warranties`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/warranties` | Danh sách phiếu bảo hành | warranty.read |
| GET | `/warranties/:id` | Chi tiết bảo hành | warranty.read |
| GET | `/warranties/lookup` | Tra cứu bảo hành | warranty.read |
| POST | `/warranties` | Tạo phiếu bảo hành (manual) | warranty.write |
| PUT | `/warranties/:id` | Cập nhật bảo hành | warranty.write |
| POST | `/warranties/:id/void` | Hủy bảo hành | warranty.void |
| GET | `/warranties/expiring` | BH sắp hết hạn | warranty.read |
| GET | `/warranties/export` | Export danh sách BH | warranty.export |
| **Claims** | | | |
| GET | `/warranties/:id/claims` | DS yêu cầu BH | warranty.read |
| POST | `/warranties/:id/claims` | Tạo yêu cầu BH | warranty.claim |
| GET | `/warranty-claims/:id` | Chi tiết yêu cầu BH | warranty.read |
| PUT | `/warranty-claims/:id` | Cập nhật yêu cầu | warranty.claim |
| PUT | `/warranty-claims/:id/status` | Cập nhật trạng thái | warranty.claim |
| GET | `/warranty-claims/:id/history` | Lịch sử xử lý | warranty.read |
| POST | `/warranty-claims/:id/return` | Trả máy cho khách | warranty.claim |

#### GET /warranties/lookup
```
Query Parameters:
- warranty_code (string) - Mã phiếu bảo hành
- serial_number (string) - Serial number
- phone (string) - SĐT khách hàng
- order_number (string) - Mã đơn hàng
```

```json
// Response
{
    "success": true,
    "data": {
        "warranty": {
            "id": "uuid",
            "warranty_code": "WR-20260303-0001",
            "product_name": "iPhone 15 Pro Max 256GB",
            "serial_number": "SN123456789",
            "purchase_date": "2026-03-03",
            "expiry_date": "2027-03-03",
            "remaining_days": 365,
            "status": "active",
            "customer": {
                "full_name": "Nguyễn Văn A",
                "phone": "0901234567"
            },
            "claims_count": 0,
            "claims": []
        }
    }
}
```

#### POST /warranties/:id/claims
```json
// Request - Tạo yêu cầu bảo hành
{
    "issue_description": "Máy không lên nguồn, đèn flash nhấp nháy liên tục",
    "issue_category": "hardware",
    "customer_id": "uuid",
    "received_condition": {
        "exterior": "Có vết trầy nhẹ góc trái",
        "screen": "Không có lỗi",
        "buttons": "Hoạt động bình thường",
        "accessories_included": ["Hộp", "Cáp sạc"]
    },
    "photos": ["url1", "url2"],
    "notes": "Khách hàng báo lỗi từ 2 ngày trước"
}

// Response 201
{
    "success": true,
    "data": {
        "claim": {
            "id": "uuid",
            "claim_number": "CLM-20260303-0001",
            "warranty_code": "WR-20260303-0001",
            "status": "received",
            "received_date": "2026-03-03T10:30:00Z",
            "estimated_date": "2026-03-10T10:30:00Z"
        }
    },
    "message": "Warranty claim created successfully"
}
```

---

### 2.8 Purchase Orders (`/purchase-orders`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/purchase-orders` | Danh sách phiếu nhập | po.read |
| POST | `/purchase-orders` | Tạo phiếu nhập | po.write |
| GET | `/purchase-orders/:id` | Chi tiết phiếu nhập | po.read |
| PUT | `/purchase-orders/:id` | Cập nhật phiếu nhập | po.write |
| POST | `/purchase-orders/:id/approve` | Duyệt phiếu | po.approve |
| POST | `/purchase-orders/:id/receive` | Nhận hàng | po.receive |
| DELETE | `/purchase-orders/:id` | Hủy phiếu | po.delete |

---

### 2.9 Customers (`/customers`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/customers` | Danh sách khách hàng | customers.read |
| POST | `/customers` | Tạo khách hàng | customers.write |
| GET | `/customers/:id` | Chi tiết khách hàng | customers.read |
| PUT | `/customers/:id` | Cập nhật khách hàng | customers.write |
| DELETE | `/customers/:id` | Xóa khách hàng | customers.delete |
| GET | `/customers/:id/orders` | Lịch sử mua hàng | customers.read |
| GET | `/customers/:id/warranties` | DS bảo hành của KH | customers.read |
| GET | `/customers/search` | Tìm kiếm KH | customers.read |

---

### 2.10 Suppliers (`/suppliers`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/suppliers` | Danh sách NCC | suppliers.read |
| POST | `/suppliers` | Tạo NCC | suppliers.write |
| GET | `/suppliers/:id` | Chi tiết NCC | suppliers.read |
| PUT | `/suppliers/:id` | Cập nhật NCC | suppliers.write |
| DELETE | `/suppliers/:id` | Xóa NCC | suppliers.delete |

---

### 2.11 Stocktake (`/stocktakes`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/stocktakes` | Danh sách kiểm kê | stocktake.read |
| POST | `/stocktakes` | Tạo phiên kiểm kê | stocktake.write |
| GET | `/stocktakes/:id` | Chi tiết kiểm kê | stocktake.read |
| PUT | `/stocktakes/:id` | Cập nhật kiểm kê | stocktake.write |
| POST | `/stocktakes/:id/count` | Cập nhật số lượng đếm | stocktake.write |
| POST | `/stocktakes/:id/complete` | Hoàn tất kiểm kê | stocktake.approve |
| GET | `/stocktakes/:id/discrepancies` | Báo cáo chênh lệch | stocktake.read |

---

### 2.12 Reports & Dashboard (`/reports`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/dashboard/summary` | Tổng quan dashboard | dashboard.read |
| GET | `/dashboard/sales-chart` | Biểu đồ doanh thu | dashboard.read |
| GET | `/reports/sales` | Báo cáo doanh thu | reports.sales |
| GET | `/reports/products` | Báo cáo sản phẩm | reports.products |
| GET | `/reports/inventory` | Báo cáo tồn kho | reports.inventory |
| GET | `/reports/warranty` | Báo cáo bảo hành | reports.warranty |
| GET | `/reports/customers` | Báo cáo khách hàng | reports.customers |
| GET | `/reports/staff` | Báo cáo nhân viên | reports.staff |
| GET | `/reports/profit` | Báo cáo lợi nhuận | reports.profit |
| POST | `/reports/export` | Export báo cáo | reports.export |

#### GET /dashboard/summary
```json
// Response
{
    "success": true,
    "data": {
        "today": {
            "revenue": 125000000,
            "orders_count": 45,
            "avg_order_value": 2777778,
            "items_sold": 68,
            "refunds": 2500000,
            "new_customers": 12
        },
        "this_month": {
            "revenue": 2850000000,
            "orders_count": 1250,
            "avg_order_value": 2280000,
            "growth_percentage": 15.3
        },
        "inventory": {
            "total_products": 1250,
            "low_stock_count": 23,
            "out_of_stock_count": 5,
            "total_value": 8500000000
        },
        "warranty": {
            "active_warranties": 3500,
            "pending_claims": 15,
            "expiring_soon": 45,
            "claims_this_month": 28
        },
        "top_products": [
            {
                "product_name": "iPhone 15 Pro Max",
                "quantity_sold": 85,
                "revenue": 2974150000
            }
        ]
    }
}
```

---

### 2.13 Notifications (`/notifications`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/notifications` | Danh sách thông báo | - |
| GET | `/notifications/unread-count` | Số thông báo chưa đọc | - |
| PUT | `/notifications/:id/read` | Đánh dấu đã đọc | - |
| PUT | `/notifications/read-all` | Đánh dấu tất cả đã đọc | - |

---

## 3. WebSocket Events

### Connection
```javascript
// Client connects
ws://localhost:8080/ws?token={access_token}&store_id={store_id}
```

### Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `inventory:updated` | Server → Client | Tồn kho thay đổi |
| `order:created` | Server → Client | Đơn hàng mới |
| `order:updated` | Server → Client | Cập nhật đơn hàng |
| `warranty:claim_updated` | Server → Client | Cập nhật BH |
| `notification:new` | Server → Client | Thông báo mới |
| `low_stock:alert` | Server → Client | Cảnh báo sắp hết hàng |
| `pos:session_expired` | Server → Client | Phiên POS hết hạn |

---

## 4. Permission System

### Permission Format
```
{resource}.{action}
```

### Available Permissions
```json
{
    "permissions": [
        // Dashboard
        "dashboard.read",
        
        // Products
        "products.read", "products.write", "products.delete",
        "products.import", "products.export",
        
        // Categories
        "categories.read", "categories.write", "categories.delete",
        
        // Inventory
        "inventory.read", "inventory.write", "inventory.adjust",
        "inventory.transfer", "inventory.report", "inventory.export",
        
        // POS
        "pos.sell", "pos.discount", "pos.session",
        "pos.refund", "pos.void",
        
        // Orders
        "orders.read", "orders.refund", "orders.export",
        
        // Warranty
        "warranty.read", "warranty.write", "warranty.void",
        "warranty.claim", "warranty.export",
        
        // Customers
        "customers.read", "customers.write", "customers.delete",
        
        // Suppliers
        "suppliers.read", "suppliers.write", "suppliers.delete",
        
        // Purchase Orders
        "po.read", "po.write", "po.approve", "po.receive", "po.delete",
        
        // Stocktake
        "stocktake.read", "stocktake.write", "stocktake.approve",
        
        // Reports
        "reports.sales", "reports.products", "reports.inventory",
        "reports.warranty", "reports.customers", "reports.staff",
        "reports.profit", "reports.export",
        
        // Users & Roles
        "users.read", "users.write", "users.delete",
        "roles.read", "roles.write",
        
        // Settings
        "settings.read", "settings.write",
        
        // Notifications
        "notifications.manage"
    ]
}
```

### Default Roles
| Role | Permissions |
|------|------------|
| **Super Admin** | All permissions |
| **Store Manager** | All except users.delete, roles.write, settings.write |
| **Cashier** | pos.*, orders.read, products.read, customers.read/write, warranty.read |
| **Warehouse Staff** | inventory.*, products.read, po.*, stocktake.* |
| **Warranty Technician** | warranty.*, products.read, customers.read |
| **Viewer** | *.read only |
