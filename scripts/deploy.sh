#!/bin/bash
# ==========================================
# Zplus POS - Deploy Script
# ==========================================
# Usage: ./scripts/deploy.sh [command]
# Commands:
#   up      - Build and start all services
#   down    - Stop all services
#   restart - Restart all services
#   logs    - View logs
#   status  - Show service status
#   build   - Build images only
#   pull    - Pull latest code and redeploy
# ==========================================

set -e

COMPOSE_FILE="docker-compose.prod.yml"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        log_warn ".env file not found. Copying from .env.production..."
        cp .env.production .env
        log_warn "⚠️  Please edit .env and change ALL default passwords before deploying!"
        exit 1
    fi
}

# Build images
build() {
    log_info "🔨 Building Docker images..."
    docker compose -f $COMPOSE_FILE build --no-cache
    log_info "✅ Build complete!"
}

# Start services
up() {
    check_env
    log_info "🚀 Starting Zplus POS services..."
    docker compose -f $COMPOSE_FILE up -d --build
    echo ""
    log_info "✅ All services started!"
    echo ""
    status
}

# Stop services
down() {
    log_info "🛑 Stopping Zplus POS services..."
    docker compose -f $COMPOSE_FILE down
    log_info "✅ All services stopped!"
}

# Restart services
restart() {
    log_info "🔄 Restarting Zplus POS services..."
    docker compose -f $COMPOSE_FILE restart
    log_info "✅ Services restarted!"
}

# View logs
logs() {
    local service=${1:-""}
    if [ -n "$service" ]; then
        docker compose -f $COMPOSE_FILE logs -f "$service"
    else
        docker compose -f $COMPOSE_FILE logs -f
    fi
}

# Show status
status() {
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${BLUE}  Zplus POS - Service Status${NC}"
    echo -e "${BLUE}===========================================${NC}"
    docker compose -f $COMPOSE_FILE ps
    echo ""
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${BLUE}  Access URLs${NC}"
    echo -e "${BLUE}===========================================${NC}"
    local port=$(grep APP_PORT .env 2>/dev/null | cut -d'=' -f2)
    port=${port:-80}
    echo -e "  🌐 Application:  http://localhost:${port}"
    echo -e "  📡 API:          http://localhost:${port}/api/v1"
    echo -e "  📄 Health Check: http://localhost:${port}/api/v1/health"
    echo -e "${BLUE}===========================================${NC}"
}

# Pull latest code and redeploy
pull() {
    log_info "📥 Pulling latest code..."
    git pull origin main
    log_info "🔨 Rebuilding and restarting..."
    up
}

# Backup databases before deploy
backup() {
    log_info "💾 Creating pre-deploy backup..."
    if [ -f ./scripts/backup.sh ]; then
        bash ./scripts/backup.sh
    else
        log_warn "Backup script not found, skipping..."
    fi
}

# Clean everything
clean() {
    log_warn "⚠️  This will remove all containers, volumes, and images!"
    read -p "Are you sure? (y/N): " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        docker compose -f $COMPOSE_FILE down -v --rmi all
        log_info "✅ Cleaned!"
    else
        log_info "Cancelled."
    fi
}

# Main
case "${1:-up}" in
    build)   build ;;
    up)      up ;;
    down)    down ;;
    restart) restart ;;
    logs)    logs "$2" ;;
    status)  status ;;
    pull)    pull ;;
    backup)  backup ;;
    clean)   clean ;;
    *)
        echo "Usage: $0 {build|up|down|restart|logs|status|pull|backup|clean}"
        echo ""
        echo "Commands:"
        echo "  build   - Build Docker images only"
        echo "  up      - Build and start all services (default)"
        echo "  down    - Stop all services"
        echo "  restart - Restart all services"
        echo "  logs    - View logs (optional: logs <service>)"
        echo "  status  - Show service status"
        echo "  pull    - Pull latest code and redeploy"
        echo "  backup  - Create database backup"
        echo "  clean   - Remove all containers, volumes, and images"
        exit 1
        ;;
esac
