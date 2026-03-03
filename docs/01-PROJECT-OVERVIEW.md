# 📋 Zplus POS - Project Overview

## 1. Giới thiệu

**Zplus POS** là hệ thống quản lý bán hàng (Point of Sale) toàn diện, tích hợp quản lý hàng tồn kho và quản lý sản phẩm bảo hành. Hệ thống được thiết kế với kiến trúc microservices, đảm bảo hiệu năng cao, khả năng mở rộng và bảo trì dễ dàng.

## 2. Mục tiêu dự án

| # | Mục tiêu | Mô tả |
|---|----------|-------|
| 1 | **Quản lý bán hàng POS** | Xử lý giao dịch bán hàng nhanh chóng, hỗ trợ nhiều phương thức thanh toán |
| 2 | **Quản lý hàng tồn kho** | Theo dõi số lượng, vị trí, và trạng thái hàng hóa theo thời gian thực |
| 3 | **Quản lý bảo hành** | Theo dõi thông tin bảo hành sản phẩm, xử lý yêu cầu bảo hành |

## 3. Tech Stack

### 3.1 Backend
| Thành phần | Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|-----------|----------|
| Framework | Go Fiber | v2.x | REST API, WebSocket, high-performance HTTP server |
| Language | Go | 1.22+ | Backend logic, concurrency |
| ORM/Query | sqlc + pgx | latest | PostgreSQL type-safe queries |
| MongoDB Driver | mongo-go-driver | v1.x | NoSQL operations |
| Redis Client | go-redis | v9.x | Caching, session, pub/sub |
| Auth | JWT + PASETO | - | Authentication & Authorization |
| Validation | go-playground/validator | v10 | Request validation |
| Logger | zerolog | - | Structured logging |
| Config | viper | - | Configuration management |
| Migration | golang-migrate | - | Database migration |
| Docs | Swagger/OpenAPI | 3.0 | API Documentation |

### 3.2 Frontend
| Thành phần | Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|-----------|----------|
| Framework | Next.js | 14+ (App Router) | SSR, SSG, React framework |
| Language | TypeScript | 5.x | Type safety |
| State Management | Zustand | latest | Client state |
| Data Fetching | TanStack Query | v5 | Server state, caching |
| UI Library | Shadcn/ui + Tailwind CSS | latest | Component library |
| Forms | React Hook Form + Zod | latest | Form handling & validation |
| Charts | Recharts | latest | Dashboard visualization |
| Table | TanStack Table | v8 | Data tables |
| Realtime | Socket.io Client | latest | WebSocket communication |
| Barcode | react-barcode / quagga2 | latest | Barcode generation & scanning |
| PDF | @react-pdf/renderer | latest | Invoice, receipt generation |
| Icons | Lucide React | latest | Icon system |

### 3.3 Database
| Database | Mục đích | Lý do chọn |
|----------|----------|------------|
| **PostgreSQL 16** | Dữ liệu giao dịch, tài khoản, sản phẩm, tồn kho | ACID, relational integrity, complex queries |
| **MongoDB 7** | Logs, audit trail, product metadata, warranty history | Flexible schema, document-based |
| **Redis 7** | Cache, sessions, real-time inventory count, pub/sub | In-memory speed, data structures |

### 3.4 Infrastructure & DevOps
| Thành phần | Công nghệ | Mục đích |
|-----------|-----------|----------|
| Container | Docker + Docker Compose | Containerization |
| CI/CD | GitHub Actions | Automated testing & deployment |
| Reverse Proxy | Nginx / Caddy | Load balancing, SSL termination |
| Monitoring | Prometheus + Grafana | Metrics & monitoring |
| Logging | ELK Stack / Loki | Centralized logging |
| Object Storage | MinIO / S3 | File storage (images, docs) |
| Message Queue | NATS / RabbitMQ | Event-driven communication |

## 4. Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Web App     │  │  Mobile App  │  │  POS Terminal        │  │
│  │  (Next.js)   │  │  (React      │  │  (Electron/Web)      │  │
│  │              │  │   Native)    │  │                      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
└─────────┼─────────────────┼──────────────────────┼──────────────┘
          │                 │                      │
          ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY / NGINX                           │
│              (Rate Limiting, SSL, Load Balancing)                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│  Auth       │  │  POS         │  │  Inventory   │
│  Service    │  │  Service     │  │  Service     │
│  (Go Fiber) │  │  (Go Fiber)  │  │  (Go Fiber)  │
└──────┬──────┘  └──────┬───────┘  └──────┬───────┘
       │                │                  │
       │         ┌──────────────┐          │
       │         │  Warranty    │          │
       │         │  Service     │          │
       │         │  (Go Fiber)  │          │
       │         └──────┬───────┘          │
       │                │                  │
       ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ PostgreSQL   │  │  MongoDB     │  │  Redis               │  │
│  │ (Transact.)  │  │  (Logs/Meta) │  │  (Cache/Session)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │ MinIO/S3     │  │ NATS/RabbitMQ│                             │
│  │ (Files)      │  │ (Events)     │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

## 5. Phân chia Modules

| Module | Service | Database | Mô tả |
|--------|---------|----------|-------|
| Auth & User Management | auth-service | PostgreSQL + Redis | Xác thực, phân quyền, quản lý user |
| Product Management | pos-service | PostgreSQL + MongoDB | Quản lý danh mục, sản phẩm, giá |
| POS / Sales | pos-service | PostgreSQL + Redis | Xử lý đơn hàng, thanh toán |
| Inventory | inventory-service | PostgreSQL + Redis | Tồn kho, nhập/xuất, kiểm kê |
| Warranty | warranty-service | PostgreSQL + MongoDB | Bảo hành, phiếu bảo hành, lịch sử |
| Reporting | report-service | PostgreSQL + MongoDB | Báo cáo, thống kê, dashboard |
| Notification | notification-service | MongoDB + Redis | Thông báo, email, SMS |

## 6. Non-Functional Requirements

| Yêu cầu | Mô tả | Metric |
|----------|-------|--------|
| Performance | API response time | < 200ms (p95) |
| Availability | System uptime | 99.9% |
| Scalability | Concurrent users | 500+ simultaneous |
| Security | Data encryption | AES-256, TLS 1.3 |
| Data Retention | Transaction logs | 5 years |
| Backup | Database backup | Daily incremental, Weekly full |
| Recovery | RTO/RPO | RTO: 4h, RPO: 1h |
