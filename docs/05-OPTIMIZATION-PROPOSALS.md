# 🚀 Optimization Proposals - Zplus POS

## 1. Performance Optimization

### 1.1 Backend Performance

#### a) Connection Pooling & Database Optimization
```
Vấn đề: Nhiều concurrent requests có thể gây bottleneck ở database connections

Giải pháp:
├── PostgreSQL Connection Pool
│   ├── Sử dụng pgxpool với MaxConns = 50, MinConns = 10
│   ├── Connection lifetime: 30 phút
│   └── Health check interval: 15 giây
│
├── MongoDB Connection Pool
│   ├── MaxPoolSize = 100
│   ├── MinPoolSize = 10
│   └── MaxIdleTimeMS = 60000
│
└── Redis Connection Pool
    ├── PoolSize = 20
    ├── MinIdleConns = 5
    └── PoolTimeout = 5s
```

#### b) Multi-Layer Caching Strategy
```
                ┌─────────────────┐
                │   Client Cache   │  Browser/Service Worker
                │   (5 min TTL)   │  TanStack Query staleTime
                └────────┬────────┘
                         │
                ┌────────▼────────┐
                │   CDN Cache     │  Static assets, images
                │   (1 hour TTL)  │  Cloudflare/CloudFront
                └────────┬────────┘
                         │
                ┌────────▼────────┐
                │  Redis Cache L1  │  Hot data: products, categories
                │   (5-15 min)    │  Inventory counters
                └────────┬────────┘
                         │
                ┌────────▼────────┐
                │  Redis Cache L2  │  Dashboard stats, reports
                │   (30-60 min)   │  Aggregated data
                └────────┬────────┘
                         │
                ┌────────▼────────┐
                │    Database     │  PostgreSQL / MongoDB
                └─────────────────┘
```

**Cache Invalidation Strategies:**
| Strategy | Use Case | Implementation |
|----------|----------|---------------|
| **TTL-based** | Dashboard stats, report snapshots | SET key value EX 300 |
| **Event-based** | Product updates, inventory changes | Pub/Sub → invalidate cache |
| **Write-through** | Inventory counters | Update cache on every write |
| **Cache-aside** | Product details, categories | Read: check cache → DB → set cache |

#### c) Query Optimization
```sql
-- Sử dụng Materialized Views cho báo cáo
CREATE MATERIALIZED VIEW mv_daily_sales AS
SELECT 
    store_id,
    DATE(created_at) as sale_date,
    COUNT(*) as total_orders,
    SUM(total_amount) as total_revenue,
    SUM(discount_amount) as total_discount,
    AVG(total_amount) as avg_order_value
FROM orders
WHERE status = 'completed'
GROUP BY store_id, DATE(created_at);

-- Refresh hàng giờ
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales;

-- Partial indexes cho queries thường dùng
CREATE INDEX idx_orders_active ON orders(created_at DESC)
    WHERE status IN ('pending', 'processing', 'confirmed');

CREATE INDEX idx_inventory_low ON inventory(variant_id, store_id)
    WHERE quantity <= reorder_level;

-- Sử dụng BRIN index cho time-series data
CREATE INDEX idx_movements_created_brin ON inventory_movements
    USING brin(created_at);
```

#### d) Go-Specific Optimizations
```
Optimizations:
├── goroutine pool cho background tasks
│   └── worker pool pattern với bounded concurrency
│
├── sync.Pool cho reusable objects
│   └── Giảm GC pressure cho request/response objects
│
├── Fiber's built-in features
│   ├── Prefork mode cho multi-process
│   ├── Zero-allocation routing
│   └── Fasthttp under the hood
│
├── Streaming responses cho large datasets
│   └── Export Excel/CSV không load toàn bộ vào memory
│
└── Context-based cancellation
    └── Cancel long-running queries khi client disconnect
```

### 1.2 Frontend Performance

#### a) Next.js Optimization
```
Strategy:
├── Server Components (mặc định)
│   ├── Dashboard page → SSR
│   ├── Reports → SSR with caching
│   └── Product list → SSR + pagination
│
├── Client Components (khi cần interactivity)
│   ├── POS terminal → Client-side
│   ├── Barcode scanner → Client-side
│   └── Real-time notifications → Client-side
│
├── Route Prefetching
│   ├── Prefetch adjacent routes
│   └── Prefetch on hover
│
├── Image Optimization
│   ├── next/image với blur placeholder
│   ├── WebP/AVIF format
│   └── Responsive sizes
│
└── Bundle Optimization
    ├── Dynamic imports cho heavy components
    ├── Tree shaking
    └── Code splitting per route
```

#### b) POS Terminal Optimization
```
POS Screen Specifics:
├── Offline-first approach
│   ├── Service Worker cache API responses
│   ├── IndexedDB cho product catalog offline
│   └── Sync queue khi online lại
│
├── Virtual scrolling cho product grid
│   └── TanStack Virtual cho 10,000+ products
│
├── Debounced search (300ms)
│   └── Server-side search với PostgreSQL full-text
│
├── Keyboard shortcuts
│   ├── F1-F12: Quick actions
│   ├── Ctrl+F: Search products
│   ├── Ctrl+P: Print receipt
│   └── Enter: Confirm payment
│
└── Barcode scanner optimization
    ├── Hardware scanner → keyboard events
    ├── Camera scanner → Web API
    └── Auto-detect input source
```

---

## 2. Architecture Optimization

### 2.1 Event-Driven Architecture (Recommended)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ POS Service  │────►│  NATS / RMQ  │────►│ Inventory Svc   │
│             │     │  Message Bus  │     │ (Update stock)  │
└─────────────┘     └──────┬───────┘     └─────────────────┘
                           │
                    ┌──────┴───────┐
                    │              │
              ┌─────▼─────┐ ┌─────▼──────┐
              │ Warranty   │ │ Notification│
              │ Service    │ │ Service     │
              │ (Auto-     │ │ (Send alert)│
              │  create)   │ │             │
              └────────────┘ └─────────────┘
```

**Events:**
| Event | Producer | Consumer(s) | Action |
|-------|----------|-------------|--------|
| `order.completed` | POS Service | Inventory, Warranty, Notification | Trừ tồn, tạo BH, thông báo |
| `order.refunded` | POS Service | Inventory, Warranty | Cộng lại tồn, void BH |
| `inventory.low_stock` | Inventory Svc | Notification | Gửi cảnh báo |
| `warranty.claim_created` | Warranty Svc | Notification | Thông báo nhân viên |
| `warranty.claim_completed` | Warranty Svc | Notification, Inventory | Thông báo KH, cập nhật tồn |

### 2.2 CQRS Pattern (cho Reporting)

```
┌─────────────────────────────────────────────────────┐
│                   WRITE SIDE                         │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │ Command  │───►│   Service   │───►│ PostgreSQL  │ │
│  │ (Create/ │    │   Layer     │    │ (Primary)   │ │
│  │  Update) │    └──────┬──────┘    └─────────────┘ │
│  └─────────┘           │                            │
│                        │ Publish Event               │
│                        ▼                             │
│              ┌─────────────────┐                     │
│              │   Event Bus     │                     │
│              └────────┬────────┘                     │
│                       │                              │
└───────────────────────┼──────────────────────────────┘
                        │
┌───────────────────────┼──────────────────────────────┐
│                  READ SIDE                            │
│                       ▼                              │
│              ┌─────────────────┐                     │
│              │  Event Handler  │                     │
│              └────────┬────────┘                     │
│                       │                              │
│           ┌───────────┼───────────┐                  │
│           ▼           ▼           ▼                  │
│  ┌──────────────┐ ┌────────┐ ┌──────────────┐      │
│  │ Materialized │ │ Redis  │ │   MongoDB    │      │
│  │ Views (PG)   │ │ Cache  │ │ (Snapshots)  │      │
│  └──────────────┘ └────────┘ └──────────────┘      │
│                                                      │
│  ┌─────────┐    ┌─────────────┐                     │
│  │  Query  │───►│ Read Service │──► Optimized reads │
│  └─────────┘    └─────────────┘                     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 2.3 Saga Pattern (cho Complex Transactions)

```
POS Checkout Saga:
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  1. Validate Cart                                        │
│     ├── ✅ Proceed to step 2                             │
│     └── ❌ Return error                                  │
│                                                          │
│  2. Reserve Inventory                                    │
│     ├── ✅ Proceed to step 3                             │
│     └── ❌ Release reservations → Return error           │
│                                                          │
│  3. Process Payment                                      │
│     ├── ✅ Proceed to step 4                             │
│     └── ❌ Release inventory → Return error              │
│                                                          │
│  4. Create Order                                         │
│     ├── ✅ Proceed to step 5                             │
│     └── ❌ Refund payment → Release inventory → Error    │
│                                                          │
│  5. Deduct Inventory (confirm reservation)               │
│     ├── ✅ Proceed to step 6                             │
│     └── ❌ Log for manual reconciliation                 │
│                                                          │
│  6. Create Warranties (if applicable)                    │
│     ├── ✅ Complete                                      │
│     └── ❌ Log for manual creation (non-critical)        │
│                                                          │
│  7. Send Notifications (async, non-blocking)             │
│     └── Fire and forget                                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Security Optimization

### 3.1 Authentication & Authorization
```
Recommendations:
├── PASETO v4 thay vì JWT
│   ├── Không có algorithm confusion attacks
│   ├── Built-in expiration
│   └── Local (symmetric) + Public (asymmetric) tokens
│
├── Token Strategy
│   ├── Access Token: 15 minutes (PASETO)
│   ├── Refresh Token: 7 days (stored in HttpOnly cookie + Redis)
│   └── Token Rotation: New refresh token on each use
│
├── Password Policy
│   ├── Argon2id hashing (thay vì bcrypt)
│   ├── Minimum 8 characters
│   ├── Complexity requirements
│   └── Breach database check (HaveIBeenPwned API)
│
├── Rate Limiting
│   ├── Login: 5 attempts / 15 minutes
│   ├── API: 100 requests / minute per user
│   └── Export: 5 requests / hour
│
└── Session Management
    ├── Single session per device
    ├── Force logout on password change
    └── Idle timeout: 30 minutes (POS), 8 hours (Admin)
```

### 3.2 Data Security
```
Encryption:
├── At Rest
│   ├── PostgreSQL: TDE (Transparent Data Encryption)
│   ├── MongoDB: Encrypted Storage Engine
│   └── Sensitive fields: AES-256-GCM (customer data, payment info)
│
├── In Transit
│   ├── TLS 1.3 everywhere
│   ├── Certificate pinning for mobile
│   └── HSTS headers
│
├── API Security
│   ├── CORS whitelist
│   ├── CSP headers
│   ├── SQL injection prevention (parameterized queries)
│   ├── XSS prevention (input sanitization)
│   ├── Request size limiting (10MB max)
│   └── Helmet middleware
│
└── Audit Trail
    ├── Log tất cả thao tác CRUD
    ├── Log login/logout events
    ├── IP tracking
    └── Immutable audit logs (MongoDB, append-only)
```

### 3.3 PCI-DSS Considerations (Payment Data)
```
Payment Security:
├── KHÔNG lưu trữ card data
│   └── Redirect to payment gateway
│
├── Tokenization cho recurring payments
│
├── PCI-compliant third-party
│   ├── VNPay, Momo, ZaloPay integration
│   └── Bank transfer QR code
│
└── Transaction signing
    └── HMAC-SHA256 cho payment webhooks
```

---

## 4. Scalability Optimization

### 4.1 Horizontal Scaling
```
                    ┌──────────────┐
                    │ Load Balancer│
                    │   (Nginx)    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼────┐ ┌────▼─────┐
        │ Backend 1  │ │Backend2│ │ Backend 3│
        │ (Go Fiber) │ │        │ │          │
        └─────┬──────┘ └───┬────┘ └────┬─────┘
              │            │            │
              └────────────┼────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼──────┐ ┌──▼────┐ ┌────▼──────┐
        │ PG Primary  │ │MongoDB│ │Redis      │
        │   ↓         │ │Replica│ │ Cluster   │
        │ PG Replica  │ │ Set   │ │           │
        └─────────────┘ └───────┘ └───────────┘
```

### 4.2 Database Scaling
```
PostgreSQL:
├── Read Replicas cho reporting queries
├── Table Partitioning
│   ├── orders: RANGE partition by created_at (monthly)
│   ├── inventory_movements: RANGE partition by created_at
│   └── audit_logs: RANGE partition by created_at
├── Archiving strategy
│   └── Move data > 2 years to archive tables
│
MongoDB:
├── Replica Set (3 nodes minimum)
├── Sharding cho large collections (audit_logs)
└── TTL indexes cho auto-cleanup
│
Redis:
├── Redis Cluster cho high availability
├── Redis Sentinel cho automatic failover
└── Separate instances: Cache vs Session vs Pub/Sub
```

### 4.3 Table Partitioning Example
```sql
-- Partition orders by month
CREATE TABLE orders (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    order_number VARCHAR(50) NOT NULL,
    -- ... other columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE orders_2026_01 PARTITION OF orders
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE orders_2026_02 PARTITION OF orders
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE orders_2026_03 PARTITION OF orders
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Auto-create partitions via pg_partman
CREATE EXTENSION pg_partman;
SELECT partman.create_parent(
    'public.orders',
    'created_at',
    'native',
    'monthly',
    p_premake := 3  -- Create 3 months ahead
);
```

---

## 5. Observability & Monitoring

### 5.1 Logging Strategy
```
Log Levels:
├── ERROR:  Unrecoverable errors, system failures
├── WARN:   Degraded performance, retry situations
├── INFO:   Business events (order created, stock adjusted)
├── DEBUG:  Detailed flow information (dev/staging only)
└── TRACE:  Very detailed debugging (dev only)

Structured Logging (zerolog):
{
    "level": "info",
    "time": "2026-03-03T10:30:00Z",
    "request_id": "uuid",
    "store_id": "uuid",
    "user_id": "uuid",
    "method": "POST",
    "path": "/api/v1/pos/checkout",
    "status": 201,
    "latency_ms": 45,
    "message": "Order completed",
    "order_id": "uuid",
    "total_amount": 34170000
}
```

### 5.2 Metrics (Prometheus)
```
Key Metrics:
├── Business Metrics
│   ├── zplus_orders_total{store, status}
│   ├── zplus_revenue_total{store}
│   ├── zplus_inventory_level{store, product}
│   ├── zplus_warranty_claims_total{store, status}
│   └── zplus_active_pos_sessions{store}
│
├── Application Metrics
│   ├── http_requests_total{method, path, status}
│   ├── http_request_duration_seconds{method, path}
│   ├── http_requests_in_flight
│   └── websocket_connections_active
│
├── Database Metrics
│   ├── db_connections_active{pool}
│   ├── db_query_duration_seconds{query}
│   └── db_errors_total{pool, type}
│
└── Cache Metrics
    ├── cache_hits_total{cache}
    ├── cache_misses_total{cache}
    └── cache_hit_ratio{cache}
```

### 5.3 Health Checks
```json
// GET /health
{
    "status": "healthy",
    "version": "1.0.0",
    "uptime": "72h30m15s",
    "checks": {
        "postgresql": { "status": "up", "latency_ms": 2 },
        "mongodb": { "status": "up", "latency_ms": 5 },
        "redis": { "status": "up", "latency_ms": 1 },
        "disk": { "status": "ok", "usage_percent": 45 },
        "memory": { "status": "ok", "usage_percent": 62 }
    }
}

// GET /health/ready (Kubernetes readiness)
// GET /health/live (Kubernetes liveness)
```

### 5.4 Alerting Rules
| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| High error rate | 5xx > 1% in 5min | Critical | Page on-call |
| Slow responses | p95 > 500ms for 5min | Warning | Slack notification |
| DB connection pool exhausted | Active = Max | Critical | Page on-call |
| Low disk space | > 85% usage | Warning | Slack notification |
| Redis down | Health check failed | Critical | Page on-call |
| High memory usage | > 90% for 10min | Warning | Auto-scale trigger |

---

## 6. Development Experience (DX) Optimization

### 6.1 Developer Tooling
```
Tools:
├── Makefile với common commands
│   ├── make dev          # Start all services
│   ├── make test         # Run all tests
│   ├── make lint         # Run linters
│   ├── make migrate-up   # Run migrations
│   ├── make seed         # Seed test data
│   ├── make swagger      # Generate API docs
│   └── make docker-up    # Start Docker services
│
├── Docker Compose cho local development
│   ├── PostgreSQL + pgAdmin
│   ├── MongoDB + Mongo Express
│   ├── Redis + RedisInsight
│   ├── MinIO (S3 compatible)
│   └── NATS Server
│
├── Hot reload
│   ├── Backend: Air (Go live reload)
│   └── Frontend: Next.js Fast Refresh
│
├── Code Generation
│   ├── sqlc: SQL → Go type-safe code
│   ├── swagger-gen: API docs → client SDK
│   └── mockgen: Interface → Mock implementations
│
└── Git Hooks (husky)
    ├── pre-commit: lint + format
    ├── commit-msg: conventional commits
    └── pre-push: run tests
```

### 6.2 Testing Strategy
```
Testing Pyramid:
┌─────────────┐
│   E2E Tests  │  Playwright/Cypress (critical flows only)
│     (5%)    │  - POS checkout flow
└──────┬──────┘  - Warranty claim flow
       │
┌──────▼──────┐
│ Integration  │  API integration tests
│   Tests     │  - Full request → response
│   (25%)     │  - Docker test containers
└──────┬──────┘
       │
┌──────▼──────┐
│  Unit Tests  │  Service layer + utility functions
│   (70%)     │  - Mock repositories
└─────────────┘  - Table-driven tests (Go)

Coverage Target: > 80% cho service layer
```

---

## 7. Additional Feature Proposals

### 7.1 Offline POS Mode
```
Giải pháp: Progressive Web App + IndexedDB

Flow:
1. Cache product catalog + pricing → IndexedDB
2. Process sales offline → Queue in IndexedDB
3. Khi online → Sync queue to server
4. Conflict resolution: Server wins, notify user

Benefits:
- Bán hàng không cần internet
- Faster product lookup (local DB)
- Auto-sync khi có kết nối
```

### 7.2 Multi-Store Inventory Management
```
Features:
├── Transfer request/approval workflow
├── Centralized stock view across all stores
├── Auto-reorder suggestions per store
├── Cross-store stock lookup from POS
└── Transfer history and tracking
```

### 7.3 Smart Warranty Management
```
AI/ML Enhancements:
├── Predict warranty claims based on product history
├── Auto-classify issue category from description
├── SLA tracking and escalation
├── Customer notification automation
│   ├── SMS khi tiếp nhận
│   ├── SMS khi hoàn thành
│   └── Email tổng kết bảo hành
└── Warranty analytics dashboard
    ├── Top products with claims
    ├── Average repair time
    └── Cost analysis
```

### 7.4 Advanced Reporting
```
Additional Reports:
├── ABC Analysis (inventory classification)
├── Sell-through rate analysis
├── Dead stock identification
├── Profit margin by product/category
├── Customer lifetime value (CLV)
├── Employee performance scorecards
├── Warranty cost vs revenue analysis
└── Automated daily/weekly email reports
```

### 7.5 Integration Proposals
```
Third-party Integrations:
├── Accounting: MISA, Fast, SAP
├── E-commerce: Shopee, Lazada, Tiki (sync inventory)
├── Payment: VNPay, Momo, ZaloPay
├── Shipping: GHN, GHTK, VNPost
├── SMS: Twilio, SpeedSMS, eSMS
├── Email: SendGrid, AWS SES
├── Tax: E-invoice (hóa đơn điện tử)
└── Barcode: Custom barcode/QR generation
```

### 7.6 Mobile App (Future)
```
React Native App:
├── POS mobile (tablet-optimized)
├── Warehouse scanning (barcode)
├── Manager dashboard
├── Warranty lookup (for customers)
└── Push notifications
```
