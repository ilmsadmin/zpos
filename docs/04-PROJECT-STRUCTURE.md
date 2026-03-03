# 📁 Project Structure - Zplus POS

## 1. Monorepo Structure

```
zplus-pos/
├── README.md
├── Makefile
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── .gitignore
├── .github/
│   └── workflows/
│       ├── backend-ci.yml
│       ├── frontend-ci.yml
│       └── deploy.yml
│
├── docs/
│   ├── 01-PROJECT-OVERVIEW.md
│   ├── 02-DATABASE-DESIGN.md
│   ├── 03-API-DESIGN.md
│   ├── 04-PROJECT-STRUCTURE.md
│   ├── 05-OPTIMIZATION-PROPOSALS.md
│   ├── 06-DEPLOYMENT-GUIDE.md
│   ├── architecture/
│   │   ├── system-architecture.png
│   │   ├── er-diagram.png
│   │   └── sequence-diagrams/
│   └── postman/
│       └── Zplus_POS.postman_collection.json
│
├── backend/
│   └── (Go Fiber application)
│
├── frontend/
│   └── (Next.js application)
│
├── migrations/
│   ├── postgresql/
│   │   ├── 000001_create_stores.up.sql
│   │   ├── 000001_create_stores.down.sql
│   │   └── ...
│   └── mongodb/
│       └── init_indexes.js
│
├── scripts/
│   ├── setup.sh
│   ├── seed.sh
│   ├── backup.sh
│   └── restore.sh
│
└── deployments/
    ├── nginx/
    │   └── nginx.conf
    ├── prometheus/
    │   └── prometheus.yml
    ├── grafana/
    │   └── dashboards/
    └── docker/
        ├── Dockerfile.backend
        └── Dockerfile.frontend
```

---

## 2. Backend Structure (Go Fiber)

```
backend/
├── cmd/
│   └── server/
│       └── main.go                 # Entry point
│
├── internal/
│   ├── config/
│   │   ├── config.go               # Configuration loading (viper)
│   │   └── config.yaml             # Default config
│   │
│   ├── server/
│   │   ├── server.go               # Fiber app setup
│   │   ├── routes.go               # Route registration
│   │   └── middleware.go            # Middleware registration
│   │
│   ├── middleware/
│   │   ├── auth.go                 # JWT authentication
│   │   ├── permission.go           # Role-based authorization
│   │   ├── cors.go                 # CORS configuration
│   │   ├── ratelimit.go            # Rate limiting
│   │   ├── logger.go               # Request logging
│   │   ├── recover.go              # Panic recovery
│   │   ├── store.go                # Store context injection
│   │   └── request_id.go           # Request ID generation
│   │
│   ├── handler/                    # HTTP Handlers (Controllers)
│   │   ├── auth_handler.go
│   │   ├── user_handler.go
│   │   ├── role_handler.go
│   │   ├── product_handler.go
│   │   ├── category_handler.go
│   │   ├── inventory_handler.go
│   │   ├── order_handler.go
│   │   ├── pos_handler.go
│   │   ├── customer_handler.go
│   │   ├── supplier_handler.go
│   │   ├── purchase_order_handler.go
│   │   ├── warranty_handler.go
│   │   ├── warranty_claim_handler.go
│   │   ├── stocktake_handler.go
│   │   ├── report_handler.go
│   │   ├── dashboard_handler.go
│   │   ├── notification_handler.go
│   │   └── upload_handler.go
│   │
│   ├── service/                    # Business Logic Layer
│   │   ├── auth_service.go
│   │   ├── user_service.go
│   │   ├── role_service.go
│   │   ├── product_service.go
│   │   ├── category_service.go
│   │   ├── inventory_service.go
│   │   ├── order_service.go
│   │   ├── pos_service.go
│   │   ├── customer_service.go
│   │   ├── supplier_service.go
│   │   ├── purchase_order_service.go
│   │   ├── warranty_service.go
│   │   ├── warranty_claim_service.go
│   │   ├── stocktake_service.go
│   │   ├── report_service.go
│   │   ├── notification_service.go
│   │   └── upload_service.go
│   │
│   ├── repository/                 # Data Access Layer
│   │   ├── interfaces.go           # Repository interfaces
│   │   ├── postgres/
│   │   │   ├── store_repo.go
│   │   │   ├── user_repo.go
│   │   │   ├── role_repo.go
│   │   │   ├── product_repo.go
│   │   │   ├── category_repo.go
│   │   │   ├── inventory_repo.go
│   │   │   ├── order_repo.go
│   │   │   ├── customer_repo.go
│   │   │   ├── supplier_repo.go
│   │   │   ├── purchase_order_repo.go
│   │   │   ├── warranty_repo.go
│   │   │   ├── warranty_claim_repo.go
│   │   │   ├── stocktake_repo.go
│   │   │   ├── payment_repo.go
│   │   │   └── pos_session_repo.go
│   │   ├── mongodb/
│   │   │   ├── audit_log_repo.go
│   │   │   ├── product_metadata_repo.go
│   │   │   ├── warranty_history_repo.go
│   │   │   ├── notification_repo.go
│   │   │   └── report_snapshot_repo.go
│   │   └── redis/
│   │       ├── cache_repo.go
│   │       ├── session_repo.go
│   │       ├── inventory_cache_repo.go
│   │       └── cart_repo.go
│   │
│   ├── model/                      # Data Models / Entities
│   │   ├── store.go
│   │   ├── user.go
│   │   ├── role.go
│   │   ├── product.go
│   │   ├── product_variant.go
│   │   ├── category.go
│   │   ├── inventory.go
│   │   ├── inventory_movement.go
│   │   ├── order.go
│   │   ├── order_item.go
│   │   ├── payment.go
│   │   ├── customer.go
│   │   ├── supplier.go
│   │   ├── purchase_order.go
│   │   ├── warranty.go
│   │   ├── warranty_claim.go
│   │   ├── stocktake.go
│   │   ├── pos_session.go
│   │   └── notification.go
│   │
│   ├── dto/                        # Data Transfer Objects
│   │   ├── request/
│   │   │   ├── auth_request.go
│   │   │   ├── product_request.go
│   │   │   ├── order_request.go
│   │   │   ├── inventory_request.go
│   │   │   ├── warranty_request.go
│   │   │   ├── customer_request.go
│   │   │   └── ...
│   │   └── response/
│   │       ├── auth_response.go
│   │       ├── product_response.go
│   │       ├── order_response.go
│   │       ├── inventory_response.go
│   │       ├── warranty_response.go
│   │       ├── dashboard_response.go
│   │       ├── pagination.go
│   │       └── ...
│   │
│   ├── validator/                  # Custom Validators
│   │   ├── validator.go
│   │   └── custom_rules.go
│   │
│   └── websocket/                  # WebSocket Handlers
│       ├── hub.go
│       ├── client.go
│       └── events.go
│
├── pkg/                            # Shared Packages
│   ├── database/
│   │   ├── postgres.go             # PostgreSQL connection
│   │   ├── mongodb.go              # MongoDB connection
│   │   └── redis.go                # Redis connection
│   ├── auth/
│   │   ├── jwt.go                  # JWT token management
│   │   └── password.go             # Password hashing (bcrypt/argon2)
│   ├── logger/
│   │   └── logger.go               # Zerolog setup
│   ├── errors/
│   │   └── errors.go               # Custom error types
│   ├── response/
│   │   └── response.go             # Standard response helpers
│   ├── utils/
│   │   ├── slug.go                 # Slug generator
│   │   ├── pagination.go           # Pagination helper
│   │   ├── barcode.go              # Barcode generator
│   │   ├── order_number.go         # Order number generator
│   │   ├── excel.go                # Excel import/export
│   │   └── pdf.go                  # PDF generation (receipts)
│   └── storage/
│       ├── storage.go              # Storage interface
│       ├── local.go                # Local file storage
│       └── s3.go                   # S3/MinIO storage
│
├── tests/
│   ├── integration/
│   │   ├── auth_test.go
│   │   ├── product_test.go
│   │   ├── order_test.go
│   │   ├── inventory_test.go
│   │   └── warranty_test.go
│   ├── unit/
│   │   ├── service/
│   │   │   ├── product_service_test.go
│   │   │   ├── order_service_test.go
│   │   │   └── inventory_service_test.go
│   │   └── utils/
│   │       └── ...
│   └── fixtures/
│       ├── products.json
│       └── orders.json
│
├── go.mod
├── go.sum
└── Makefile
```

### Backend Layers Flow
```
Request → Middleware → Handler → Service → Repository → Database
                         ↓          ↓
                        DTO      Model/Entity
```

---

## 3. Frontend Structure (Next.js 14 App Router)

```
frontend/
├── public/
│   ├── images/
│   │   ├── logo.svg
│   │   ├── logo-dark.svg
│   │   └── placeholder.png
│   ├── fonts/
│   └── favicon.ico
│
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Root page (redirect to /dashboard or /login)
│   │   ├── loading.tsx             # Global loading
│   │   ├── error.tsx               # Global error boundary
│   │   ├── not-found.tsx           # 404 page
│   │   │
│   │   ├── (auth)/                 # Auth group (no sidebar)
│   │   │   ├── layout.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── forgot-password/
│   │   │       └── page.tsx
│   │   │
│   │   └── (dashboard)/            # Dashboard group (with sidebar)
│   │       ├── layout.tsx          # Dashboard layout with sidebar & header
│   │       ├── dashboard/
│   │       │   └── page.tsx        # Dashboard home
│   │       │
│   │       ├── pos/                # POS Module
│   │       │   ├── page.tsx        # POS terminal screen
│   │       │   └── sessions/
│   │       │       └── page.tsx    # Session management
│   │       │
│   │       ├── products/           # Product Management
│   │       │   ├── page.tsx        # Product list
│   │       │   ├── new/
│   │       │   │   └── page.tsx    # Create product
│   │       │   ├── [id]/
│   │       │   │   ├── page.tsx    # Product detail/edit
│   │       │   │   └── variants/
│   │       │   │       └── page.tsx
│   │       │   ├── categories/
│   │       │   │   └── page.tsx    # Category management
│   │       │   └── import/
│   │       │       └── page.tsx    # Import products
│   │       │
│   │       ├── inventory/          # Inventory Management
│   │       │   ├── page.tsx        # Inventory overview
│   │       │   ├── movements/
│   │       │   │   └── page.tsx    # Stock movements history
│   │       │   ├── adjust/
│   │       │   │   └── page.tsx    # Stock adjustment
│   │       │   ├── transfer/
│   │       │   │   └── page.tsx    # Stock transfer
│   │       │   └── stocktake/
│   │       │       ├── page.tsx    # Stocktake list
│   │       │       ├── new/
│   │       │       │   └── page.tsx
│   │       │       └── [id]/
│   │       │           └── page.tsx
│   │       │
│   │       ├── orders/             # Order Management
│   │       │   ├── page.tsx        # Order list
│   │       │   └── [id]/
│   │       │       └── page.tsx    # Order detail
│   │       │
│   │       ├── warranty/           # Warranty Management
│   │       │   ├── page.tsx        # Warranty list
│   │       │   ├── lookup/
│   │       │   │   └── page.tsx    # Warranty lookup
│   │       │   ├── [id]/
│   │       │   │   └── page.tsx    # Warranty detail
│   │       │   └── claims/
│   │       │       ├── page.tsx    # Claims list
│   │       │       ├── new/
│   │       │       │   └── page.tsx
│   │       │       └── [id]/
│   │       │           └── page.tsx
│   │       │
│   │       ├── customers/          # Customer Management
│   │       │   ├── page.tsx
│   │       │   ├── new/
│   │       │   │   └── page.tsx
│   │       │   └── [id]/
│   │       │       └── page.tsx
│   │       │
│   │       ├── suppliers/          # Supplier Management
│   │       │   ├── page.tsx
│   │       │   ├── new/
│   │       │   │   └── page.tsx
│   │       │   └── [id]/
│   │       │       └── page.tsx
│   │       │
│   │       ├── purchase-orders/    # Purchase Orders
│   │       │   ├── page.tsx
│   │       │   ├── new/
│   │       │   │   └── page.tsx
│   │       │   └── [id]/
│   │       │       └── page.tsx
│   │       │
│   │       ├── reports/            # Reports
│   │       │   ├── page.tsx        # Reports dashboard
│   │       │   ├── sales/
│   │       │   │   └── page.tsx
│   │       │   ├── inventory/
│   │       │   │   └── page.tsx
│   │       │   ├── warranty/
│   │       │   │   └── page.tsx
│   │       │   └── profit/
│   │       │       └── page.tsx
│   │       │
│   │       ├── users/              # User Management
│   │       │   ├── page.tsx
│   │       │   ├── new/
│   │       │   │   └── page.tsx
│   │       │   ├── [id]/
│   │       │   │   └── page.tsx
│   │       │   └── roles/
│   │       │       └── page.tsx
│   │       │
│   │       └── settings/           # Settings
│   │           ├── page.tsx        # General settings
│   │           ├── store/
│   │           │   └── page.tsx    # Store settings
│   │           └── profile/
│   │               └── page.tsx    # User profile
│   │
│   ├── components/                 # Reusable Components
│   │   ├── ui/                     # Shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── command.tsx         # Command palette
│   │   │   ├── sheet.tsx           # Slide-over panel
│   │   │   └── ...
│   │   │
│   │   ├── layout/                 # Layout components
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── footer.tsx
│   │   │   ├── breadcrumb.tsx
│   │   │   └── page-header.tsx
│   │   │
│   │   ├── shared/                 # Shared business components
│   │   │   ├── data-table.tsx      # Generic data table with sorting/filtering
│   │   │   ├── data-table-toolbar.tsx
│   │   │   ├── data-table-pagination.tsx
│   │   │   ├── search-input.tsx
│   │   │   ├── date-range-picker.tsx
│   │   │   ├── file-upload.tsx
│   │   │   ├── image-upload.tsx
│   │   │   ├── barcode-scanner.tsx
│   │   │   ├── barcode-display.tsx
│   │   │   ├── price-input.tsx
│   │   │   ├── quantity-input.tsx
│   │   │   ├── status-badge.tsx
│   │   │   ├── confirm-dialog.tsx
│   │   │   ├── empty-state.tsx
│   │   │   ├── loading-skeleton.tsx
│   │   │   ├── stats-card.tsx
│   │   │   ├── customer-select.tsx
│   │   │   ├── product-select.tsx
│   │   │   └── print-receipt.tsx
│   │   │
│   │   ├── pos/                    # POS specific components
│   │   │   ├── pos-terminal.tsx
│   │   │   ├── product-grid.tsx
│   │   │   ├── product-search.tsx
│   │   │   ├── cart-panel.tsx
│   │   │   ├── cart-item.tsx
│   │   │   ├── payment-dialog.tsx
│   │   │   ├── payment-method-selector.tsx
│   │   │   ├── receipt-preview.tsx
│   │   │   ├── quick-customer.tsx
│   │   │   ├── session-summary.tsx
│   │   │   └── numpad.tsx
│   │   │
│   │   ├── products/               # Product specific components
│   │   │   ├── product-form.tsx
│   │   │   ├── variant-form.tsx
│   │   │   ├── category-tree.tsx
│   │   │   └── product-card.tsx
│   │   │
│   │   ├── inventory/              # Inventory specific components
│   │   │   ├── stock-level-indicator.tsx
│   │   │   ├── movement-timeline.tsx
│   │   │   ├── adjustment-form.tsx
│   │   │   └── transfer-form.tsx
│   │   │
│   │   ├── warranty/               # Warranty specific components
│   │   │   ├── warranty-card.tsx
│   │   │   ├── warranty-lookup-form.tsx
│   │   │   ├── claim-form.tsx
│   │   │   ├── claim-timeline.tsx
│   │   │   └── warranty-status-flow.tsx
│   │   │
│   │   └── dashboard/              # Dashboard specific components
│   │       ├── revenue-chart.tsx
│   │       ├── orders-chart.tsx
│   │       ├── top-products.tsx
│   │       ├── low-stock-alert.tsx
│   │       └── warranty-overview.tsx
│   │
│   ├── hooks/                      # Custom React Hooks
│   │   ├── use-auth.ts
│   │   ├── use-permissions.ts
│   │   ├── use-store.ts
│   │   ├── use-debounce.ts
│   │   ├── use-local-storage.ts
│   │   ├── use-media-query.ts
│   │   ├── use-websocket.ts
│   │   ├── use-barcode-scanner.ts
│   │   └── use-keyboard-shortcut.ts
│   │
│   ├── stores/                     # Zustand State Stores
│   │   ├── auth-store.ts
│   │   ├── cart-store.ts
│   │   ├── pos-session-store.ts
│   │   ├── notification-store.ts
│   │   └── ui-store.ts             # Sidebar state, theme, etc.
│   │
│   ├── services/                   # API Service Layer
│   │   ├── api-client.ts           # Axios/fetch instance with interceptors
│   │   ├── auth-service.ts
│   │   ├── product-service.ts
│   │   ├── category-service.ts
│   │   ├── inventory-service.ts
│   │   ├── order-service.ts
│   │   ├── customer-service.ts
│   │   ├── supplier-service.ts
│   │   ├── purchase-order-service.ts
│   │   ├── warranty-service.ts
│   │   ├── report-service.ts
│   │   ├── notification-service.ts
│   │   └── upload-service.ts
│   │
│   ├── lib/                        # Utilities & Helpers
│   │   ├── utils.ts                # General utilities (cn, formatCurrency, etc.)
│   │   ├── constants.ts            # App constants
│   │   ├── validations.ts          # Zod schemas
│   │   ├── format.ts               # Formatting helpers
│   │   ├── date.ts                 # Date utilities
│   │   └── permissions.ts          # Permission helpers
│   │
│   ├── types/                      # TypeScript Types
│   │   ├── auth.ts
│   │   ├── product.ts
│   │   ├── inventory.ts
│   │   ├── order.ts
│   │   ├── warranty.ts
│   │   ├── customer.ts
│   │   ├── supplier.ts
│   │   ├── report.ts
│   │   ├── notification.ts
│   │   └── common.ts               # Shared types (Pagination, ApiResponse, etc.)
│   │
│   ├── providers/                  # React Context Providers
│   │   ├── query-provider.tsx      # TanStack Query provider
│   │   ├── theme-provider.tsx      # Theme (light/dark)
│   │   ├── auth-provider.tsx       # Auth context
│   │   └── websocket-provider.tsx  # WebSocket context
│   │
│   └── styles/
│       └── globals.css             # Tailwind CSS + custom styles
│
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.js
├── package.json
└── .env.local
```

---

## 4. Key Design Patterns

### Backend Patterns
| Pattern | Usage |
|---------|-------|
| **Repository Pattern** | Data access abstraction, easy to swap databases |
| **Service Layer** | Business logic encapsulation |
| **DTO Pattern** | Separate request/response from internal models |
| **Dependency Injection** | Constructor injection for testability |
| **Middleware Chain** | Cross-cutting concerns (auth, logging, rate limiting) |
| **Event-Driven** | Pub/Sub for real-time updates |

### Frontend Patterns
| Pattern | Usage |
|---------|-------|
| **Component Composition** | Reusable UI building blocks |
| **Custom Hooks** | Shared logic extraction |
| **Container/Presentational** | Separation of concerns |
| **Optimistic Updates** | Better UX for mutations |
| **Error Boundaries** | Graceful error handling |
| **Route Groups** | Next.js layout organization |
