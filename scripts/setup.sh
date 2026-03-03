#!/bin/bash
set -e

echo "🚀 Setting up Zplus POS development environment..."

# Copy env file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
else
    echo "ℹ️  .env file already exists, skipping"
fi

# Start infrastructure
echo "📦 Starting infrastructure services..."
docker compose up -d postgres mongodb redis minio nats
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Run backend setup
echo "🔧 Setting up backend..."
cd backend
go mod download
echo "✅ Backend dependencies installed"

# Run migrations
echo "📊 Running database migrations..."
go run cmd/migrate/main.go up
echo "✅ Migrations completed"

# Seed data
echo "🌱 Seeding database..."
go run cmd/seed/main.go
echo "✅ Database seeded"
cd ..

# Run frontend setup
echo "🎨 Setting up frontend..."
cd frontend
pnpm install
echo "✅ Frontend dependencies installed"
cd ..

echo ""
echo "============================================"
echo "✅ Setup complete!"
echo "============================================"
echo ""
echo "Start development:"
echo "  Terminal 1: make dev-backend"
echo "  Terminal 2: make dev-frontend"
echo ""
echo "Access:"
echo "  Frontend:  http://localhost:3000"
echo "  API:       http://localhost:8080/api/v1"
echo "  Swagger:   http://localhost:8080/swagger"
echo ""
