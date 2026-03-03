# 🚢 Deployment Guide - Zplus POS

## 1. Development Environment Setup

### 1.1 Prerequisites
```
Required:
├── Go 1.22+
├── Node.js 20+ (LTS)
├── pnpm 9+ (recommended) hoặc npm
├── Docker & Docker Compose
├── Git
└── Make (build tool)

Recommended IDEs:
├── VS Code with extensions:
│   ├── Go (golang.go)
│   ├── ESLint
│   ├── Tailwind CSS IntelliSense
│   ├── Prettier
│   ├── Thunder Client (API testing)
│   └── Docker
│
├── GoLand (JetBrains)
└── DataGrip (Database management)
```

### 1.2 Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/zplus-pos.git
cd zplus-pos

# 2. Copy environment files
cp .env.example .env

# 3. Start infrastructure services
docker compose up -d postgres mongodb redis minio nats

# 4. Run database migrations
make migrate-up

# 5. Seed initial data
make seed

# 6. Start backend (with hot reload)
cd backend
make dev
# API available at http://localhost:8080

# 7. Start frontend (in another terminal)
cd frontend
pnpm install
pnpm dev
# App available at http://localhost:3000
```

---

## 2. Docker Configuration

### 2.1 docker-compose.yml (Development)
```yaml
version: '3.9'

services:
  # ==========================================
  # Database Services
  # ==========================================
  postgres:
    image: postgres:16-alpine
    container_name: zplus-postgres
    environment:
      POSTGRES_DB: zplus_pos
      POSTGRES_USER: zplus_user
      POSTGRES_PASSWORD: ${PG_PASSWORD:-zplus_secret}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations/postgresql:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U zplus_user -d zplus_pos"]
      interval: 10s
      timeout: 5s
      retries: 5

  mongodb:
    image: mongo:7
    container_name: zplus-mongodb
    environment:
      MONGO_INITDB_ROOT_USERNAME: zplus_user
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD:-zplus_secret}
      MONGO_INITDB_DATABASE: zplus_pos
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
      - ./migrations/mongodb:/docker-entrypoint-initdb.d

  redis:
    image: redis:7-alpine
    container_name: zplus-redis
    command: redis-server --requirepass ${REDIS_PASSWORD:-zplus_secret} --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # ==========================================
  # Infrastructure Services
  # ==========================================
  minio:
    image: minio/minio:latest
    container_name: zplus-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_USER:-minio_admin}
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD:-minio_secret}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  nats:
    image: nats:latest
    container_name: zplus-nats
    ports:
      - "4222:4222"   # Client
      - "8222:8222"   # Monitoring
    command: "-js"      # Enable JetStream

  # ==========================================
  # Management Tools (Development only)
  # ==========================================
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: zplus-pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@zplus.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    profiles:
      - tools

  mongo-express:
    image: mongo-express:latest
    container_name: zplus-mongo-express
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: zplus_user
      ME_CONFIG_MONGODB_ADMINPASSWORD: ${MONGO_PASSWORD:-zplus_secret}
      ME_CONFIG_MONGODB_URL: mongodb://zplus_user:${MONGO_PASSWORD:-zplus_secret}@mongodb:27017/
    ports:
      - "8081:8081"
    depends_on:
      - mongodb
    profiles:
      - tools

  redis-insight:
    image: redislabs/redisinsight:latest
    container_name: zplus-redis-insight
    ports:
      - "8001:8001"
    profiles:
      - tools

volumes:
  postgres_data:
  mongodb_data:
  redis_data:
  minio_data:
```

### 2.2 docker-compose.prod.yml
```yaml
version: '3.9'

services:
  # ==========================================
  # Application Services
  # ==========================================
  backend:
    build:
      context: .
      dockerfile: deployments/docker/Dockerfile.backend
    container_name: zplus-backend
    environment:
      - APP_ENV=production
      - PG_HOST=postgres
      - MONGO_HOST=mongodb
      - REDIS_HOST=redis
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
      mongodb:
        condition: service_started
      redis:
        condition: service_started
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1.0'
          memory: 512M

  frontend:
    build:
      context: .
      dockerfile: deployments/docker/Dockerfile.frontend
    container_name: zplus-frontend
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8080/api/v1
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped

  # ==========================================
  # Reverse Proxy
  # ==========================================
  nginx:
    image: nginx:alpine
    container_name: zplus-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deployments/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./deployments/nginx/ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

  # ==========================================
  # Monitoring
  # ==========================================
  prometheus:
    image: prom/prometheus:latest
    container_name: zplus-prometheus
    volumes:
      - ./deployments/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    container_name: zplus-grafana
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD:-admin}
    volumes:
      - ./deployments/grafana/dashboards:/var/lib/grafana/dashboards
    ports:
      - "3001:3000"
```

### 2.3 Dockerfile.backend
```dockerfile
# Build stage
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /app

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/server

# Runtime stage
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/server .
COPY --from=builder /app/internal/config/config.yaml ./config/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -q --spider http://localhost:8080/health || exit 1

CMD ["./server"]
```

### 2.4 Dockerfile.frontend
```dockerfile
# Dependencies
FROM node:20-alpine AS deps

WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ .

ENV NEXT_TELEMETRY_DISABLED 1

RUN corepack enable pnpm && pnpm build

# Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

---

## 3. Environment Configuration

### 3.1 .env.example
```bash
# ==========================================
# Application
# ==========================================
APP_ENV=development
APP_PORT=8080
APP_NAME=zplus-pos
APP_VERSION=1.0.0
APP_SECRET_KEY=your-super-secret-key-change-this

# ==========================================
# PostgreSQL
# ==========================================
PG_HOST=localhost
PG_PORT=5432
PG_USER=zplus_user
PG_PASSWORD=zplus_secret
PG_DATABASE=zplus_pos
PG_SSL_MODE=disable
PG_MAX_CONNS=50
PG_MIN_CONNS=10

# ==========================================
# MongoDB
# ==========================================
MONGO_URI=mongodb://zplus_user:zplus_secret@localhost:27017/zplus_pos?authSource=admin
MONGO_DATABASE=zplus_pos

# ==========================================
# Redis
# ==========================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=zplus_secret
REDIS_DB=0

# ==========================================
# JWT / PASETO
# ==========================================
AUTH_ACCESS_TOKEN_DURATION=15m
AUTH_REFRESH_TOKEN_DURATION=168h  # 7 days
AUTH_TOKEN_SECRET=your-token-secret-32-chars-min!!

# ==========================================
# Storage (MinIO/S3)
# ==========================================
STORAGE_TYPE=minio  # local | minio | s3
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minio_admin
MINIO_SECRET_KEY=minio_secret
MINIO_BUCKET=zplus-pos
MINIO_USE_SSL=false

# ==========================================
# NATS
# ==========================================
NATS_URL=nats://localhost:4222

# ==========================================
# Frontend
# ==========================================
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
NEXT_PUBLIC_APP_NAME=Zplus POS
```

---

## 4. Makefile

```makefile
.PHONY: help dev test lint build docker-up docker-down migrate-up migrate-down seed swagger

# Default
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ==========================================
# Development
# ==========================================
dev: ## Start all services for development
	docker compose up -d postgres mongodb redis minio nats
	@echo "Infrastructure started. Run 'make dev-backend' and 'make dev-frontend' in separate terminals."

dev-backend: ## Start backend with hot reload
	cd backend && air

dev-frontend: ## Start frontend dev server
	cd frontend && pnpm dev

# ==========================================
# Database
# ==========================================
migrate-up: ## Run all migrations
	cd backend && go run cmd/migrate/main.go up

migrate-down: ## Rollback last migration
	cd backend && go run cmd/migrate/main.go down 1

migrate-create: ## Create new migration (name=xxx)
	migrate create -ext sql -dir migrations/postgresql -seq $(name)

seed: ## Seed database with test data
	cd backend && go run cmd/seed/main.go

# ==========================================
# Testing
# ==========================================
test: ## Run all tests
	cd backend && go test ./... -v -cover
	cd frontend && pnpm test

test-backend: ## Run backend tests
	cd backend && go test ./... -v -cover -count=1

test-frontend: ## Run frontend tests
	cd frontend && pnpm test

test-integration: ## Run integration tests
	cd backend && go test ./tests/integration/... -v -tags=integration

test-e2e: ## Run E2E tests
	cd frontend && pnpm test:e2e

# ==========================================
# Code Quality
# ==========================================
lint: ## Run linters
	cd backend && golangci-lint run
	cd frontend && pnpm lint

fmt: ## Format code
	cd backend && gofmt -s -w .
	cd frontend && pnpm format

# ==========================================
# Build
# ==========================================
build: build-backend build-frontend ## Build all

build-backend: ## Build backend binary
	cd backend && CGO_ENABLED=0 go build -ldflags="-s -w" -o bin/server ./cmd/server

build-frontend: ## Build frontend
	cd frontend && pnpm build

# ==========================================
# Docker
# ==========================================
docker-up: ## Start all Docker services
	docker compose up -d

docker-down: ## Stop all Docker services
	docker compose down

docker-build: ## Build Docker images
	docker compose -f docker-compose.prod.yml build

docker-logs: ## View Docker logs
	docker compose logs -f

# ==========================================
# Documentation
# ==========================================
swagger: ## Generate Swagger docs
	cd backend && swag init -g cmd/server/main.go -o docs/swagger

# ==========================================
# Utilities
# ==========================================
clean: ## Clean build artifacts
	cd backend && rm -rf bin/
	cd frontend && rm -rf .next/ node_modules/

backup-db: ## Backup databases
	./scripts/backup.sh

restore-db: ## Restore databases
	./scripts/restore.sh
```

---

## 5. CI/CD Pipeline

### 5.1 GitHub Actions - Backend CI
```yaml
# .github/workflows/backend-ci.yml
name: Backend CI

on:
  push:
    branches: [main, develop]
    paths: ['backend/**']
  pull_request:
    branches: [main]
    paths: ['backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: zplus_pos_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_pass
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        ports: ['6379:6379']
      
      mongodb:
        image: mongo:7
        ports: ['27017:27017']

    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'
      
      - name: Cache Go modules
        uses: actions/cache@v4
        with:
          path: ~/go/pkg/mod
          key: ${{ runner.os }}-go-${{ hashFiles('backend/go.sum') }}
      
      - name: Run Linter
        uses: golangci/golangci-lint-action@v4
        with:
          working-directory: backend
      
      - name: Run Tests
        working-directory: backend
        env:
          PG_HOST: localhost
          PG_PORT: 5432
          PG_USER: test_user
          PG_PASSWORD: test_pass
          PG_DATABASE: zplus_pos_test
          REDIS_HOST: localhost
          MONGO_URI: mongodb://localhost:27017/zplus_pos_test
        run: |
          go test ./... -v -race -coverprofile=coverage.out
          go tool cover -func=coverage.out
      
      - name: Upload Coverage
        uses: codecov/codecov-action@v4
        with:
          files: backend/coverage.out

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Docker Image
        run: |
          docker build -f deployments/docker/Dockerfile.backend -t zplus-backend:${{ github.sha }} .
      
      - name: Push to Registry
        run: |
          # Push to your container registry
          echo "Push image to registry"
```

### 5.2 GitHub Actions - Frontend CI
```yaml
# .github/workflows/frontend-ci.yml
name: Frontend CI

on:
  push:
    branches: [main, develop]
    paths: ['frontend/**']
  pull_request:
    branches: [main]
    paths: ['frontend/**']

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          cache-dependency-path: frontend/pnpm-lock.yaml
      
      - name: Install dependencies
        working-directory: frontend
        run: pnpm install --frozen-lockfile
      
      - name: Lint
        working-directory: frontend
        run: pnpm lint
      
      - name: Type Check
        working-directory: frontend
        run: pnpm type-check
      
      - name: Run Tests
        working-directory: frontend
        run: pnpm test
      
      - name: Build
        working-directory: frontend
        run: pnpm build

  e2e:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run E2E Tests
        working-directory: frontend
        run: |
          pnpm install
          pnpm test:e2e
```

---

## 6. Production Deployment Checklist

```
Pre-Deployment:
├── [ ] All tests passing (unit + integration)
├── [ ] Code reviewed and approved
├── [ ] Database migrations tested on staging
├── [ ] Environment variables configured
├── [ ] SSL certificates valid
├── [ ] Backup completed
├── [ ] Rollback plan documented
├── [ ] Performance testing completed
└── [ ] Security scan passed

Post-Deployment:
├── [ ] Health check endpoints responding
├── [ ] Smoke tests passing
├── [ ] Monitoring dashboards green
├── [ ] Error rates normal
├── [ ] Response times within SLA
├── [ ] Database connections stable
└── [ ] Notify team of successful deployment
```

---

## 7. Backup & Recovery

### 7.1 Backup Strategy
```
Schedule:
├── PostgreSQL
│   ├── Full backup: Weekly (Sunday 2:00 AM)
│   ├── Incremental: Daily (2:00 AM)
│   ├── WAL archiving: Continuous
│   └── Retention: 30 days
│
├── MongoDB
│   ├── Full dump: Daily (3:00 AM)
│   ├── Oplog backup: Continuous
│   └── Retention: 30 days
│
├── Redis
│   ├── RDB snapshot: Every 15 minutes
│   ├── AOF: Enabled (appendfsync everysec)
│   └── Retention: 7 days
│
└── Files (MinIO/S3)
    ├── Cross-region replication
    └── Versioning enabled
```

### 7.2 Backup Script
```bash
#!/bin/bash
# scripts/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/${DATE}"

mkdir -p ${BACKUP_DIR}

# PostgreSQL backup
echo "Backing up PostgreSQL..."
pg_dump -h ${PG_HOST} -U ${PG_USER} -d ${PG_DATABASE} \
    -F c -f ${BACKUP_DIR}/postgresql_${DATE}.dump

# MongoDB backup
echo "Backing up MongoDB..."
mongodump --uri="${MONGO_URI}" --out=${BACKUP_DIR}/mongodb/

# Redis backup
echo "Backing up Redis..."
redis-cli -h ${REDIS_HOST} -a ${REDIS_PASSWORD} BGSAVE
cp /data/dump.rdb ${BACKUP_DIR}/redis_${DATE}.rdb

# Compress and upload to S3
tar -czf ${BACKUP_DIR}.tar.gz ${BACKUP_DIR}
aws s3 cp ${BACKUP_DIR}.tar.gz s3://zplus-backups/${DATE}/

# Clean old local backups (keep 7 days)
find /backups -mtime +7 -delete

echo "Backup completed: ${BACKUP_DIR}"
```
