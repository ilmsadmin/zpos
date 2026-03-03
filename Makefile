# Zplus POS - Makefile
# Usage: make <target>

.PHONY: help dev dev-backend dev-frontend test lint build docker-up docker-down migrate-up migrate-down seed swagger clean

# ==========================================
# Help
# ==========================================
help: ## Show available commands
	@echo "Zplus POS - Available Commands:"
	@echo "================================"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-25s\033[0m %s\n", $$1, $$2}'

# ==========================================
# Development
# ==========================================
dev: ## Start infrastructure services (PostgreSQL, MongoDB, Redis, MinIO, NATS)
	docker compose up -d postgres mongodb redis minio nats
	@echo ""
	@echo "✅ Infrastructure services started!"
	@echo "   PostgreSQL: localhost:5432"
	@echo "   MongoDB:    localhost:27017"
	@echo "   Redis:      localhost:6379"
	@echo "   MinIO:      localhost:9000 (console: 9001)"
	@echo "   NATS:       localhost:4222"
	@echo ""
	@echo "Run 'make dev-backend' and 'make dev-frontend' in separate terminals."

dev-tools: ## Start management tools (pgAdmin, Mongo Express, Redis Insight)
	docker compose --profile tools up -d
	@echo ""
	@echo "✅ Management tools started!"
	@echo "   pgAdmin:       http://localhost:5050"
	@echo "   Mongo Express:  http://localhost:8081"
	@echo "   Redis Insight:  http://localhost:8001"

dev-backend: ## Start backend with hot reload (requires 'air')
	cd backend && air

dev-frontend: ## Start frontend dev server
	cd frontend && pnpm dev

# ==========================================
# Database
# ==========================================
migrate-up: ## Run all pending migrations
	cd backend && go run cmd/migrate/main.go up

migrate-down: ## Rollback last migration
	cd backend && go run cmd/migrate/main.go down 1

migrate-create: ## Create new migration (usage: make migrate-create name=create_xxx)
	@if [ -z "$(name)" ]; then echo "Usage: make migrate-create name=create_xxx"; exit 1; fi
	migrate create -ext sql -dir migrations/postgresql -seq $(name)

seed: ## Seed database with test/default data
	cd backend && go run cmd/seed/main.go

db-reset: ## Reset database (drop + recreate + migrate + seed)
	@echo "⚠️  This will destroy all data. Press Ctrl+C to cancel..."
	@sleep 3
	cd backend && go run cmd/migrate/main.go down -all
	cd backend && go run cmd/migrate/main.go up
	cd backend && go run cmd/seed/main.go
	@echo "✅ Database reset complete!"

# ==========================================
# Testing
# ==========================================
test: ## Run all tests
	@echo "Running backend tests..."
	cd backend && go test ./... -v -cover
	@echo ""
	@echo "Running frontend tests..."
	cd frontend && pnpm test

test-backend: ## Run backend tests with coverage
	cd backend && go test ./... -v -race -coverprofile=coverage.out
	cd backend && go tool cover -func=coverage.out

test-frontend: ## Run frontend tests
	cd frontend && pnpm test

test-integration: ## Run integration tests (requires running services)
	cd backend && go test ./tests/integration/... -v -tags=integration -count=1

test-e2e: ## Run E2E tests
	cd frontend && pnpm test:e2e

test-coverage: ## Generate HTML coverage report
	cd backend && go test ./... -coverprofile=coverage.out
	cd backend && go tool cover -html=coverage.out -o coverage.html
	@echo "✅ Coverage report: backend/coverage.html"

# ==========================================
# Code Quality
# ==========================================
lint: ## Run linters (backend + frontend)
	@echo "Linting backend..."
	cd backend && golangci-lint run ./...
	@echo ""
	@echo "Linting frontend..."
	cd frontend && pnpm lint

fmt: ## Format all code
	cd backend && gofmt -s -w .
	cd frontend && pnpm format

vet: ## Run go vet
	cd backend && go vet ./...

# ==========================================
# Build
# ==========================================
build: build-backend build-frontend ## Build all

build-backend: ## Build backend binary
	cd backend && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o bin/server ./cmd/server
	@echo "✅ Backend binary: backend/bin/server"

build-frontend: ## Build frontend for production
	cd frontend && pnpm build
	@echo "✅ Frontend built: frontend/.next/"

# ==========================================
# Docker
# ==========================================
docker-up: ## Start all Docker services
	docker compose up -d
	@echo "✅ All services started!"

docker-down: ## Stop all Docker services
	docker compose down

docker-build: ## Build production Docker images
	docker compose -f docker-compose.prod.yml build

docker-push: ## Push Docker images to registry
	docker compose -f docker-compose.prod.yml push

docker-logs: ## View Docker service logs
	docker compose logs -f

docker-clean: ## Remove all containers, volumes, and images
	docker compose down -v --rmi all

# ==========================================
# Documentation
# ==========================================
swagger: ## Generate Swagger/OpenAPI documentation
	cd backend && swag init -g cmd/server/main.go -o docs/swagger
	@echo "✅ Swagger docs generated: backend/docs/swagger/"

# ==========================================
# Utilities
# ==========================================
clean: ## Clean build artifacts
	cd backend && rm -rf bin/ coverage.out coverage.html
	cd frontend && rm -rf .next/ out/ node_modules/.cache/
	@echo "✅ Cleaned!"

install: ## Install all dependencies
	cd backend && go mod download
	cd frontend && pnpm install
	@echo "✅ Dependencies installed!"

update: ## Update all dependencies
	cd backend && go get -u ./... && go mod tidy
	cd frontend && pnpm update
	@echo "✅ Dependencies updated!"

backup: ## Backup databases
	./scripts/backup.sh

restore: ## Restore databases from backup
	./scripts/restore.sh

setup: ## Initial project setup (first time)
	@echo "🚀 Setting up Zplus POS..."
	cp -n .env.example .env || true
	make install
	make dev
	@sleep 5
	make migrate-up
	make seed
	@echo ""
	@echo "✅ Setup complete! Run:"
	@echo "   Terminal 1: make dev-backend"
	@echo "   Terminal 2: make dev-frontend"
	@echo ""
	@echo "   Frontend:  http://localhost:3000"
	@echo "   API:       http://localhost:8080/api/v1"
