# ✅ Zplus POS - Project Task Management

> **Cập nhật lần cuối:** 2026-03-03
> **Trạng thái:** 🟡 Đang phát triển

---

## 📊 Tổng quan tiến độ

| Phase | Trạng thái | Tiến độ | Deadline |
|-------|-----------|---------|----------|
| Phase 1: Foundation | ✅ Done | 95% | 2026-04-15 |
| Phase 2: Core Features | ✅ Done | 90% | 2026-06-15 |
| Phase 2b: POS, Inventory & Warranty | 🟡 In Progress | 90% | 2026-08-15 |
| Phase 3: Advanced Features | 🟡 In Progress | 40% | 2026-08-15 |
| Phase 4: Optimization & Launch | ⚪ Not Started | 0% | 2026-09-30 |

**Chú thích:** ✅ Done | 🔄 In Progress | ⚪ Not Started | ❌ Blocked | ⏸️ On Hold

### 🔧 Backend Architecture Status

| Layer | Files | Status |
|-------|-------|--------|
| Models | `model/models.go`, `model/order.go`, `model/warranty.go` | ✅ Done |
| DTOs | `dto/auth_dto.go`, `dto/product_dto.go`, `dto/order_dto.go` | ✅ Done |
| Repository Interfaces | `repository/interfaces.go` (15 interfaces) | ✅ Done |
| Service Interfaces | `service/interfaces.go` (15 interfaces) | ✅ Done |
| Postgres Repos | 14 files in `repository/postgres/` | ✅ Done |
| Services | 15 files in `service/` (incl. dashboard, purchase_order, stocktake) | ✅ Done |
| Handlers | 15 files in `handler/` (incl. dashboard, purchase_order, stocktake) | ✅ Done |
| Router | `router/router.go` - all routes registered | ✅ Done |
| Middleware | auth, permission, store context, rate limit | ✅ Done |
| DI Wiring | `server/server.go` - repo→service→handler wiring | ✅ Done |
| Validator | `validator/validator.go` | ✅ Done |
| Compilation | `go build ./...` passes ✅ | ✅ Done |

---

## 🏗️ Phase 1: Foundation (6 tuần)

### 1.1 Project Setup & Infrastructure
- [ ] Khởi tạo Git repository, branch strategy (main/develop/feature)
- [x] Setup monorepo structure (backend/, frontend/, docs/, migrations/)
- [x] Tạo file `.env.example`, `.gitignore`, `Makefile`
- [x] Viết `docker-compose.yml` cho development
  - [x] PostgreSQL 16
  - [x] MongoDB 7
  - [x] Redis 7
  - [x] MinIO (S3-compatible storage)
  - [x] NATS (message queue)
- [x] Setup management tools (pgAdmin, Mongo Express, Redis Insight)
- [x] Viết scripts: `setup.sh`, `seed.sh`, `backup.sh`
- [ ] Cấu hình CI/CD GitHub Actions
  - [ ] Backend CI (lint, test, build)
  - [ ] Frontend CI (lint, type-check, test, build)
  - [ ] Deploy workflow (staging, production)

### 1.2 Backend - Project Init
- [x] Init Go module (`go mod init`)
- [x] Setup Go Fiber v2 server
- [x] Cấu hình Viper (config management)
- [x] Setup Zerolog (structured logging)
- [x] Kết nối PostgreSQL (pgxpool)
- [x] Kết nối MongoDB (mongo-go-driver)
- [x] Kết nối Redis (go-redis v9)
- [x] Tạo cấu trúc thư mục: `cmd/`, `internal/`, `pkg/`
- [x] Implement base response helpers (`pkg/response/`)
- [x] Implement custom error types (`pkg/errors/`)
- [ ] Setup Swagger/OpenAPI auto-generation

### 1.3 Backend - Middleware
- [x] CORS middleware
- [x] Request ID middleware
- [x] Logger middleware (request/response logging)
- [x] Panic recovery middleware
- [x] Rate limiting middleware (Redis-based)
- [x] Store context middleware (X-Store-ID header)

### 1.4 Database Migrations
- [ ] Setup golang-migrate
- [x] Migration: `create_stores`
- [x] Migration: `create_roles`
- [x] Migration: `create_users`
- [x] Migration: `create_categories`
- [x] Migration: `create_products`
- [x] Migration: `create_product_variants`
- [x] Migration: `create_inventory`
- [x] Migration: `create_inventory_movements`
- [x] Migration: `create_customers`
- [x] Migration: `create_orders`
- [x] Migration: `create_order_items`
- [x] Migration: `create_payments`
- [x] Migration: `create_suppliers`
- [x] Migration: `create_purchase_orders`
- [x] Migration: `create_purchase_order_items`
- [x] Migration: `create_warranties`
- [x] Migration: `create_warranty_claims`
- [x] Migration: `create_pos_sessions`
- [x] Migration: `create_stocktakes`
- [x] Migration: `create_stocktake_items`
- [x] Migration: `seed_default_data` (roles, admin user, demo store)
- [x] MongoDB: `init_indexes.js` (audit_logs, notifications, product_metadata)

### 1.5 Frontend - Project Init
- [x] Init Next.js 14 (App Router, TypeScript)
- [x] Setup Tailwind CSS
- [x] Install & configure Shadcn/ui
- [x] Setup Zustand (state management)
- [x] Setup TanStack Query v5 (data fetching)
- [x] Setup React Hook Form + Zod (forms & validation)
- [x] Tạo API client (axios/fetch interceptors, token refresh)
- [x] Tạo cấu trúc thư mục: `app/`, `components/`, `hooks/`, `services/`, `types/`, `lib/`
- [x] Cấu hình providers (QueryProvider, ThemeProvider, AuthProvider)

### 1.6 Frontend - Layout & Base Components
- [x] Root layout (fonts, metadata, providers)
- [x] Auth layout (login page, no sidebar)
- [x] Dashboard layout (sidebar + header + content)
- [x] Sidebar component (collapsible, navigation menu)
- [x] Header component (user menu, notifications, store selector)
- [ ] Breadcrumb component
- [x] Page header component (title + actions)
- [x] Data table component (sorting, filtering, pagination)
- [x] Empty state component
- [x] Loading skeleton component
- [x] Confirm dialog component
- [x] Toast/notification system (Sonner)
- [ ] Theme switcher (light/dark mode)

### 🎨 Frontend Architecture Status

| Layer | Files | Status |
|-------|-------|--------|
| API Client | `lib/api.ts` (interceptors, token refresh) | ✅ Done |
| Auth Store | `stores/auth-store.ts` (Zustand) | ✅ Done |
| POS Store | `stores/pos-store.ts` (Zustand) | ✅ Done |
| Services | 13 files in `services/` (auth, product, order, customer, supplier, inventory, warranty, pos-session, store, user, category, dashboard, purchase-order, stocktake) | ✅ Done |
| Types | `types/api.ts` (~600 lines, all backend DTOs) | ✅ Done |
| UI Components | 22+ Shadcn components in `components/ui/` | ✅ Done |
| Reusable Components | DataTable, PageHeader, ConfirmDialog, Breadcrumb, EmptyState | ✅ Done |
| Auth Guard | `components/auth-guard.tsx` | ✅ Done |
| Layout | sidebar, header | ✅ Done |
| Pages (API integrated) | dashboard, products, orders, customers, suppliers, inventory, warranties, pos, stocktake, reports, settings | ✅ Done |
| Providers | QueryProvider, root providers | ✅ Done |

---

## 🛒 Phase 2: Core Features (8 tuần)

### 2.1 Authentication & Authorization
**Backend:**
- [x] JWT/PASETO token generation & validation
- [x] Password hashing (Argon2id)
- [x] `POST /auth/login` - Đăng nhập
- [x] `POST /auth/logout` - Đăng xuất
- [x] `POST /auth/refresh` - Refresh token
- [x] `POST /auth/change-password` - Đổi mật khẩu
- [x] `GET /auth/me` - Thông tin user hiện tại
- [x] Auth middleware (JWT verification)
- [x] Permission middleware (role-based access)
- [ ] Session management (Redis)

**Frontend:**
- [x] Login page (form + validation)
- [x] Auth store (Zustand) - token, user, permissions
- [x] Auth provider (auto refresh, redirect)
- [x] Protected route wrapper
- [x] Permission-based UI rendering (`usePermissions` hook)
- [x] Logout functionality

### 2.2 User & Role Management
**Backend:**
- [x] CRUD `/users` (list, create, get, update, soft delete)
- [x] CRUD `/roles` (list, create, get, update)
- [x] Permission system (JSONB-based)
- [x] Default roles seeding (Admin, Manager, Cashier, Warehouse, Technician)
- [x] Repository layer (user_repo.go, role_repo.go)
- [x] Service layer (user_service.go, role_service.go)
- [x] Handler layer (user_handler.go, role_handler.go)
- [x] Routes registered with permission middleware

**Frontend:**
- [x] Users list page (data table + search + filter)
- [x] Create/edit user form
- [x] Roles list page
- [x] Create/edit role form (permission checkboxes)
- [x] User profile page

### 2.3 Store Management
**Backend:**
- [x] CRUD `/stores` (list, get, update)
- [x] Store settings (JSONB - receipt format, tax config, etc.)
- [x] Repository layer (store_repo.go)
- [x] Service layer (store_service.go)
- [x] Handler layer (store_handler.go)
- [x] Routes registered with permission middleware

**Frontend:**
- [x] Store settings page
- [ ] Store selector (multi-store support)

### 2.4 Category Management
**Backend:**
- [x] CRUD `/categories` (list as tree, create, get, update, delete)
- [ ] `PUT /categories/reorder` - Sắp xếp thứ tự
- [ ] Slug auto-generation
- [x] Category tree query (recursive CTE)
- [x] Repository layer (category_repo.go)
- [x] Service layer (category_service.go)
- [x] Handler layer (category_handler.go)
- [x] Routes registered with permission middleware

**Frontend:**
- [x] Category management page (tree view)
- [x] Create/edit category dialog
- [ ] Drag & drop reordering
- [ ] Category image upload

### 2.5 Product Management
**Backend:**
- [x] CRUD `/products` (list, create, get, update, delete)
- [x] `GET /products/search` - Full-text search
- [x] `GET /products/barcode/:barcode` - Lookup by barcode
- [x] CRUD `/products/:id/variants` (create, update, delete)
- [ ] `POST /products/import` - Import Excel/CSV
- [ ] `GET /products/export` - Export Excel/CSV
- [ ] Product metadata CRUD (MongoDB)
- [ ] Image upload to MinIO/S3
- [ ] Barcode generation
- [x] Repository layer (product_repo.go)
- [x] Service layer (product_service.go)
- [x] Handler layer (product_handler.go)
- [x] Routes registered with permission middleware

**Frontend:**
- [x] Product list page (data table + filters + search)
- [x] Create product page (multi-step form)
  - [x] Basic info (name, category, brand, description)
  - [x] Variants (SKU, barcode, price, attributes)
  - [ ] Images upload
  - [ ] Warranty settings
- [x] Edit product page
- [x] Product detail page
- [ ] Import products page (Excel/CSV upload + preview)
- [ ] Barcode display component

### 2.6 Customer Management
**Backend:**
- [x] CRUD `/customers` (list, create, get, update, delete)
- [x] `GET /customers/search` - Tìm kiếm (tên, SĐT, email)
- [x] `GET /customers/:id/orders` - Lịch sử mua hàng
- [x] `GET /customers/:id/warranties` - DS bảo hành
- [x] Repository layer (customer_repo.go)
- [x] Service layer (customer_service.go)
- [x] Handler layer (customer_handler.go)
- [x] Routes registered with permission middleware

**Frontend:**
- [x] Customer list page
- [x] Create/edit customer form
- [x] Customer detail page (info + order history + warranties)
- [x] Quick customer creation dialog (from POS)
- [x] Customer search/select component

### 2.7 Supplier Management
**Backend:**
- [x] CRUD `/suppliers` (list, create, get, update, delete)
- [x] Repository layer (supplier_repo.go)
- [x] Service layer (supplier_service.go)
- [x] Handler layer (supplier_handler.go)
- [x] Routes registered with permission middleware

**Frontend:**
- [x] Supplier list page
- [x] Create/edit supplier form
- [x] Supplier detail page

---

## 💰 Phase 2b: POS, Inventory & Warranty (8 tuần)

### 2.8 Inventory Management
**Backend:**
- [ ] `GET /inventory` - Danh sách tồn kho (join products + variants)
- [x] `GET /inventory/:variant_id` - Chi tiết tồn kho
- [ ] `PUT /inventory/:variant_id` - Cập nhật thông tin tồn kho
- [x] `POST /inventory/adjust` - Điều chỉnh tồn kho (single)
- [x] `POST /inventory/adjust/bulk` - Điều chỉnh tồn kho (batch)
- [ ] `POST /inventory/transfer` - Chuyển kho giữa chi nhánh
- [x] `GET /inventory/:variant_id/movements` - Lịch sử xuất/nhập kho
- [x] `GET /inventory/low-stock` - Danh sách sắp hết hàng
- [ ] `GET /inventory/valuation` - Giá trị tồn kho
- [ ] `GET /inventory/export` - Export báo cáo
- [ ] Redis real-time inventory counter (HSET/HINCRBY)
- [ ] Low stock alert event (→ notification service)
- [x] Inventory movement auto-logging
- [x] Repository layer (inventory_repo.go)
- [x] Service layer (inventory_service.go)
- [x] Handler layer (inventory_handler.go)
- [x] Routes registered with permission middleware

**Frontend:**
- [x] Inventory overview page (stock levels + filters)
- [x] Stock level indicator component (color-coded)
- [x] Stock adjustment page (batch adjust form)
- [ ] Stock transfer page (from store → to store)
- [x] Movement history page (timeline view)
- [ ] Low stock alerts panel
- [ ] Inventory valuation report

### 2.9 Purchase Orders (Nhập hàng)
**Backend:**
- [x] CRUD `/purchase-orders` (list, create, get, update)
- [x] `POST /purchase-orders/:id/approve` - Duyệt phiếu
- [x] `POST /purchase-orders/:id/receive` - Nhận hàng (partial/full)
- [x] Auto-update inventory on receive
- [x] Auto-create inventory movements
- [x] Repository layer (purchase_order_repo.go)
- [x] Service layer (purchase_order_service.go)
- [x] Handler layer (purchase_order_handler.go)
- [x] Routes registered with permission middleware

**Frontend:**
- [x] Purchase order list page
- [x] Create purchase order page (select supplier + add items)
- [x] PO detail page (status flow, receive items)
- [x] Partial receive dialog

### 2.10 POS - Point of Sale
**Backend:**
- [x] `POST /pos/sessions/open` - Mở ca bán hàng
- [x] `POST /pos/sessions/:id/close` - Đóng ca bán hàng
- [x] `GET /pos/sessions/current` - Ca hiện tại
- [x] `GET /pos/sessions` - Danh sách sessions
- [x] Repository layer (pos_session_repo.go)
- [x] Service layer (pos_session_service.go)
- [x] Handler layer (pos_session_handler.go)
- [x] Routes registered with permission middleware
- [ ] Cart management (Redis-based)
  - [ ] `GET /pos/cart` - Lấy giỏ hàng
  - [ ] `POST /pos/cart/items` - Thêm item
  - [ ] `PUT /pos/cart/items/:id` - Cập nhật quantity
  - [ ] `DELETE /pos/cart/items/:id` - Xóa item
  - [ ] `PUT /pos/cart/discount` - Áp dụng giảm giá
  - [ ] `PUT /pos/cart/customer` - Gán khách hàng
  - [ ] `DELETE /pos/cart` - Xóa giỏ hàng
- [ ] `POST /pos/checkout` - Thanh toán (Saga pattern)
  - [ ] Validate cart & stock availability
  - [ ] Reserve inventory
  - [ ] Process payment(s)
  - [ ] Create order + order items
  - [ ] Deduct inventory
  - [ ] Create warranties (if applicable)
  - [ ] Send notifications (async)
- [ ] Order number generation (sequential per store per day)
- [x] Warranty code generation

**Frontend:**
- [x] POS terminal page (full-screen, optimized layout)
  - [x] Product search bar (name, SKU, barcode)
  - [x] Product grid / list view
  - [x] Category filter tabs
  - [x] Cart panel (right side)
  - [x] Cart item row (qty +/-, price, discount, remove)
  - [x] Customer assignment
  - [x] Order-level discount
  - [ ] Order notes
- [x] Payment dialog
  - [x] Cash payment (with change calculation)
  - [x] Card payment
  - [x] Bank transfer (QR code display)
  - [ ] Split payment (mixed methods)
- [ ] Receipt preview & print
- [ ] Barcode scanner integration
  - [ ] Hardware scanner (keyboard event listener)
  - [ ] Camera scanner (Web API)
- [ ] Keyboard shortcuts (F1-F12, Enter, Escape)
- [x] POS session management (open/close ca)
- [x] Session summary (sales, payments breakdown)
- [ ] Numpad component (for touch screens)

### 2.11 Order Management
**Backend:**
- [x] `GET /orders` - Danh sách đơn hàng (filters, pagination)
- [x] `GET /orders/:id` - Chi tiết đơn hàng
- [x] `POST /orders` - Tạo đơn hàng
- [x] `POST /orders/:id/cancel` - Hủy đơn hàng
- [x] `POST /orders/:id/refund` - Hoàn trả (full/partial)
- [x] `GET /orders/daily-summary` - Báo cáo doanh thu ngày
- [ ] Restore inventory on refund
- [ ] Void related warranties on refund
- [ ] `GET /orders/:id/receipt` - Generate receipt PDF
- [ ] `GET /orders/:id/invoice` - Generate VAT invoice
- [ ] `GET /orders/export` - Export orders
- [x] Repository layer (order_repo.go, payment_repo.go)
- [x] Service layer (order_service.go)
- [x] Handler layer (order_handler.go)
- [x] Routes registered with permission middleware

**Frontend:**
- [x] Order list page (data table + status filter + date range)
- [x] Order detail page (items, payments, warranty info)
- [x] Refund dialog (select items, reason, amount)
- [ ] Receipt print / PDF download
- [ ] Invoice generation

### 2.12 Warranty Management
**Backend:**
- [x] `GET /warranties` - Danh sách phiếu bảo hành
- [x] `GET /warranties/:id` - Chi tiết bảo hành
- [x] `GET /warranties/lookup` - Tra cứu (mã BH, serial, SĐT, mã đơn)
- [x] `POST /warranties` - Tạo phiếu BH thủ công
- [x] `PUT /warranties/:id` - Cập nhật
- [x] `POST /warranties/:id/void` - Hủy bảo hành
- [x] `GET /warranties/expiring` - BH sắp hết hạn
- [ ] Auto-create warranty on POS checkout
- [ ] Warranty expiry check (scheduled job)
- [x] Warranty claims:
  - [x] `POST /warranties/:id/claims` - Tạo yêu cầu BH
  - [x] `GET /warranty-claims/:id` - Chi tiết yêu cầu
  - [x] `PUT /warranty-claims/:id` - Cập nhật (diagnosis, resolution)
  - [x] `PUT /warranty-claims/:id/status` - Chuyển trạng thái
  - [ ] `GET /warranty-claims/:id/history` - Lịch sử xử lý (MongoDB)
  - [x] `POST /warranty-claims/:id/return` - Trả máy cho khách
- [ ] Warranty history logging (MongoDB)
- [ ] Customer notification on status change
- [x] Repository layer (warranty_repo.go)
- [x] Service layer (warranty_service.go)
- [x] Handler layer (warranty_handler.go)
- [x] Routes registered with permission middleware

**Frontend:**
- [x] Warranty list page (data table + status filter)
- [x] Warranty lookup page (search form + results)
- [x] Warranty detail page (info + claims history)
- [x] Create warranty page (manual warranty creation)
- [x] Create warranty claim page
  - [x] Product info display
  - [x] Issue description form
  - [ ] Photo upload (condition at receive)
  - [ ] Accessories checklist
- [x] Claim detail page
  - [x] Status flow visualization (horizontal stepper)
  - [x] Timeline of events
  - [x] Diagnosis & resolution forms
  - [x] Return device to customer
  - [ ] Parts used tracking
  - [ ] Print warranty claim receipt
- [x] Warranty status flow component
- [x] Expiring warranties alert

### 2.13 Stocktake (Kiểm kê)
**Backend:**
- [x] CRUD `/stocktakes` (list, create, get)
- [x] `POST /stocktakes/:id/count` - Cập nhật số lượng đếm
- [x] `POST /stocktakes/:id/complete` - Hoàn tất kiểm kê (auto-adjust inventory)
- [ ] `GET /stocktakes/:id/discrepancies` - Báo cáo chênh lệch
- [x] Repository layer (stocktake_repo.go)
- [x] Service layer (stocktake_service.go)
- [x] Handler layer (stocktake_handler.go)
- [x] Routes registered with permission middleware

**Frontend:**
- [x] Stocktake list page
- [x] Create stocktake page (select products / all)
- [x] Stocktake counting page (barcode scan + qty input)
- [ ] Discrepancy report page
- [x] Complete & adjust confirmation dialog

---

## 📈 Phase 3: Advanced Features (8 tuần)

### 3.1 Dashboard & Reports
**Backend:**
- [x] `GET /dashboard/summary` - KPI tổng quan
- [x] `GET /dashboard/sales-chart` - Biểu đồ doanh thu (by day/week/month)
- [x] `GET /dashboard/top-products` - Sản phẩm bán chạy
- [ ] `GET /reports/sales` - Báo cáo doanh thu chi tiết
- [ ] `GET /reports/products` - Báo cáo sản phẩm bán chạy
- [ ] `GET /reports/inventory` - Báo cáo tồn kho
- [ ] `GET /reports/warranty` - Báo cáo bảo hành
- [ ] `GET /reports/customers` - Báo cáo khách hàng
- [ ] `GET /reports/staff` - Báo cáo nhân viên
- [ ] `GET /reports/profit` - Báo cáo lợi nhuận
- [ ] `POST /reports/export` - Export báo cáo (Excel/PDF)
- [ ] Materialized views cho aggregation queries
- [ ] Report snapshots (MongoDB, scheduled)

**Frontend:**
- [x] Dashboard page
  - [x] Stats cards (doanh thu, đơn hàng, khách mới, tồn kho)
  - [x] Revenue chart (Recharts - line/bar chart)
  - [x] Top selling products
  - [x] Low stock alerts
  - [ ] Warranty overview
  - [x] Recent orders
- [x] Sales report page (date range, filters, charts)
- [ ] Product report page (best sellers, slow movers)
- [ ] Inventory report page (stock value, turnover)
- [ ] Warranty report page (claims by status, avg repair time)
- [ ] Customer report page (CLV, retention)
- [ ] Staff report page (sales by staff)
- [ ] Profit report page (margin analysis)
- [ ] Export to Excel/PDF buttons

### 3.2 Notification System
**Backend:**
- [ ] `GET /notifications` - Danh sách thông báo
- [ ] `GET /notifications/unread-count` - Số chưa đọc
- [ ] `PUT /notifications/:id/read` - Đánh dấu đã đọc
- [ ] `PUT /notifications/read-all` - Đọc tất cả
- [ ] Notification creation service (low stock, warranty, order events)
- [ ] MongoDB storage with TTL (90 days auto-delete)

**Frontend:**
- [ ] Notification bell icon (header, unread badge)
- [ ] Notification dropdown panel
- [ ] Notification list page (full view)
- [ ] Mark as read / mark all as read

### 3.3 WebSocket Real-time Updates
**Backend:**
- [ ] WebSocket hub (Go Fiber WebSocket)
- [ ] Client connection management
- [ ] Event broadcasting per store
- [ ] Events: `inventory:updated`, `order:created`, `notification:new`, `warranty:claim_updated`

**Frontend:**
- [ ] WebSocket provider (auto-connect, reconnect)
- [ ] `useWebSocket` hook
- [ ] Real-time inventory update on POS screen
- [ ] Real-time notification push
- [ ] Toast on new events

### 3.4 Event-Driven Architecture
**Backend:**
- [ ] NATS connection & JetStream setup
- [ ] Event publisher service
- [ ] Event consumers:
  - [ ] `order.completed` → Inventory deduction
  - [ ] `order.completed` → Warranty creation
  - [ ] `order.completed` → Notification
  - [ ] `order.refunded` → Inventory restoration
  - [ ] `order.refunded` → Warranty void
  - [ ] `inventory.low_stock` → Notification
  - [ ] `warranty.claim_updated` → Customer notification
- [ ] Dead letter queue for failed events
- [ ] Event retry mechanism

### 3.5 Audit Trail
**Backend:**
- [ ] Audit log middleware / service
- [ ] Log all CRUD operations (before/after state)
- [ ] Log auth events (login, logout, password change)
- [ ] MongoDB audit_logs collection with indexes
- [ ] `GET /audit-logs` - Query audit trail (admin only)

**Frontend:**
- [ ] Audit log viewer page (admin)
- [ ] Activity timeline on resource detail pages

### 3.6 File Upload & Storage
**Backend:**
- [ ] Storage interface (`pkg/storage/`)
- [ ] MinIO/S3 implementation
- [ ] Local storage fallback
- [ ] Image resize & optimization
- [ ] `POST /upload` - File upload endpoint
- [ ] `DELETE /upload/:id` - File deletion

**Frontend:**
- [ ] File upload component (drag & drop)
- [ ] Image upload with preview & crop
- [ ] Multiple file upload

---

## ⚡ Phase 4: Optimization & Launch (6 tuần)

### 4.1 Performance Optimization
- [ ] Implement multi-layer caching (Redis L1/L2)
- [ ] Cache invalidation strategy (event-based)
- [ ] PostgreSQL query optimization (EXPLAIN ANALYZE)
- [ ] Partial indexes cho common queries
- [ ] BRIN indexes cho time-series tables
- [ ] Table partitioning cho orders, inventory_movements (monthly)
- [ ] Materialized views cho dashboard/reports
- [ ] Connection pool tuning (PostgreSQL, MongoDB, Redis)
- [ ] Frontend: Dynamic imports cho heavy components
- [ ] Frontend: Image optimization (next/image, WebP)
- [ ] Frontend: Virtual scrolling cho large lists
- [ ] API response compression (gzip)

### 4.2 Security Hardening
- [ ] PASETO token implementation (replace JWT nếu đang dùng)
- [ ] Argon2id password hashing verification
- [ ] Rate limiting per endpoint tuning
- [ ] CORS whitelist configuration
- [ ] CSP headers
- [ ] Request body size limiting
- [ ] SQL injection audit (parameterized queries check)
- [ ] XSS prevention audit
- [ ] Sensitive data encryption (AES-256-GCM)
- [ ] API key for external integrations
- [ ] Security headers (Helmet equivalent)

### 4.3 Testing
- [ ] Backend unit tests (service layer) - target >80%
- [ ] Backend integration tests (API endpoints)
- [ ] Frontend unit tests (components, hooks)
- [ ] Frontend integration tests (pages)
- [ ] E2E tests - POS checkout flow (Playwright)
- [ ] E2E tests - Warranty claim flow
- [ ] E2E tests - Inventory adjustment flow
- [ ] Load testing (k6 / Artillery)
- [ ] Security testing (OWASP ZAP)

### 4.4 Monitoring & Observability
- [ ] Prometheus metrics endpoint (`/metrics`)
- [ ] Custom business metrics (orders, revenue, inventory)
- [ ] Grafana dashboards setup
- [ ] Health check endpoints (`/health`, `/health/ready`, `/health/live`)
- [ ] Alerting rules (high error rate, slow responses, DB issues)
- [ ] Structured logging verification
- [ ] Error tracking (Sentry integration)

### 4.5 Documentation & Polish
- [ ] API documentation hoàn chỉnh (Swagger)
- [ ] Postman collection
- [ ] User guide / Manual sử dụng
- [ ] Admin setup guide
- [ ] Architecture decision records (ADRs)
- [ ] Code comments & documentation
- [ ] CHANGELOG.md
- [ ] LICENSE

### 4.6 Deployment
- [ ] Production Docker images (multi-stage builds)
- [ ] Nginx reverse proxy configuration
- [ ] SSL certificate (Let's Encrypt / custom)
- [ ] Database backup automation (daily/weekly)
- [ ] Database restore testing
- [ ] Staging environment setup
- [ ] Production environment setup
- [ ] Domain & DNS configuration
- [ ] Deployment runbook
- [ ] Rollback procedure documentation
- [ ] Smoke test checklist

---

## 🔮 Future Enhancements (Backlog)

### Offline POS
- [ ] Service Worker setup
- [ ] IndexedDB product catalog sync
- [ ] Offline sale queue
- [ ] Online sync mechanism
- [ ] Conflict resolution strategy

### Multi-Store Advanced
- [ ] Centralized inventory view
- [ ] Inter-store transfer approval workflow
- [ ] Cross-store stock lookup from POS
- [ ] Store performance comparison dashboard

### Smart Warranty
- [ ] SLA tracking & escalation
- [ ] Auto SMS/email notifications
- [ ] Warranty analytics (top claim products, avg repair time, cost analysis)
- [ ] QR code warranty card

### E-commerce Integration
- [ ] Shopee inventory sync
- [ ] Lazada inventory sync
- [ ] Tiki inventory sync
- [ ] Unified order management

### Payment Gateway Integration
- [ ] VNPay integration
- [ ] Momo integration
- [ ] ZaloPay integration
- [ ] Bank QR code (VietQR)

### Accounting Integration
- [ ] E-invoice (hóa đơn điện tử)
- [ ] MISA accounting export
- [ ] Tax report generation

### Mobile App
- [ ] React Native project setup
- [ ] POS mobile (tablet)
- [ ] Warehouse scanning app
- [ ] Manager dashboard app
- [ ] Customer warranty lookup app

### AI/ML Features
- [ ] Demand forecasting
- [ ] Auto-reorder suggestions
- [ ] Customer segmentation
- [ ] Warranty claim classification

---

## 📝 Sprint Log

### Sprint 1 (Week 1-2): Foundation
**Goal:** Project setup, infrastructure, database migrations
| Task | Assignee | Status | Notes |
|------|----------|--------|-------|
| | | | |

### Sprint 2 (Week 3-4): Auth & Base UI
**Goal:** Authentication, layout, base components
| Task | Assignee | Status | Notes |
|------|----------|--------|-------|
| | | | |

### Sprint 3 (Week 5-6): Products & Categories
**Goal:** Product CRUD, category tree, image upload
| Task | Assignee | Status | Notes |
|------|----------|--------|-------|
| | | | |

### Sprint 4 (Week 7-8): Inventory
**Goal:** Inventory management, stock movements, purchase orders
| Task | Assignee | Status | Notes |
|------|----------|--------|-------|
| | | | |

### Sprint 5 (Week 9-10): POS
**Goal:** POS terminal, cart, checkout, payments
| Task | Assignee | Status | Notes |
|------|----------|--------|-------|
| | | | |

### Sprint 6 (Week 11-12): Warranty
**Goal:** Warranty management, claims, status tracking
| Task | Assignee | Status | Notes |
|------|----------|--------|-------|
| | | | |

### Sprint 7 (Week 13-14): Orders & Customers
**Goal:** Order management, refunds, customer management
| Task | Assignee | Status | Notes |
|------|----------|--------|-------|
| | | | |

### Sprint 8 (Week 15-16): Reports & Dashboard
**Goal:** Dashboard, reports, charts, export
| Task | Assignee | Status | Notes |
|------|----------|--------|-------|
| | | | |

### Sprint 9 (Week 17-18): Real-time & Events
**Goal:** WebSocket, notifications, event-driven architecture
| Task | Assignee | Status | Notes |
|------|----------|--------|-------|
| | | | |

### Sprint 10 (Week 19-20): Audit & Storage
**Goal:** Audit trail, file upload, stocktake
| Task | Assignee | Status | Notes |
|------|----------|--------|-------|
| | | | |

### Sprint 11 (Week 21-24): Optimization & Testing
**Goal:** Performance, security, testing, monitoring
| Task | Assignee | Status | Notes |
|------|----------|--------|-------|
| | | | |

### Sprint 12 (Week 25-28): Polish & Launch
**Goal:** Documentation, deployment, go-live
| Task | Assignee | Status | Notes |
|------|----------|--------|-------|
| | | | |

---

## 🐛 Bug Tracker

| # | Severity | Module | Description | Status | Assigned |
|---|----------|--------|-------------|--------|----------|
| | | | | | |

---

## 💡 Improvement Ideas

| # | Category | Idea | Priority | Status |
|---|----------|------|----------|--------|
| 1 | UX | Keyboard shortcut guide overlay (?) | Medium | ⚪ |
| 2 | Performance | Implement CQRS for reporting queries | High | ⚪ |
| 3 | UX | Dark mode cho POS screen (giảm mỏi mắt) | Low | ⚪ |
| 4 | Feature | Loyalty points / membership tiers | Medium | ⚪ |
| 5 | Feature | Promotions & coupon management | Medium | ⚪ |
| 6 | Integration | Barcode label printer support | High | ⚪ |
| 7 | Feature | Multi-currency support | Low | ⚪ |
| 8 | UX | POS - Recently sold products quick access | Medium | ⚪ |
