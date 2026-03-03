#!/bin/bash
set -e

echo "🌱 Seeding Zplus POS database..."
cd backend
go run cmd/seed/main.go
echo "✅ Database seeded successfully!"
