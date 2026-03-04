#!/bin/bash
# ==========================================
# Zplus POS - Remote Server Deploy Script
# ==========================================
# Usage: ./deploy/deploy-server.sh [command]
# 
# Commands:
#   setup     - First-time server setup (install Docker, setup registry)
#   deploy    - Build, push images, and deploy on server
#   push      - Build and push images only (no restart)
#   pull      - Pull and restart services on server
#   status    - Show service status on server
#   logs      - View service logs on server
#   restart   - Restart services on server
#   stop      - Stop services on server
#   clean     - Remove everything on server
#   backup    - Backup databases on server
#   rollback  - Rollback to previous image tag
#   ssh       - Open SSH session to server
# ==========================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "${CYAN}[STEP]${NC}  $1"; }

# ==========================================
# Load config
# ==========================================
load_config() {
    local config_file="$SCRIPT_DIR/.env.server.local"
    
    if [ ! -f "$config_file" ]; then
        log_error "Config file not found: $config_file"
        log_info "Create it by running:"
        echo "  cp deploy/.env.server deploy/.env.server.local"
        echo "  nano deploy/.env.server.local"
        exit 1
    fi
    
    # shellcheck disable=SC1090
    source "$config_file"
    
    # Resolve REGISTRY_HOST if it references SERVER_HOST
    REGISTRY_HOST="${REGISTRY_HOST:-$SERVER_HOST}"
    REGISTRY_PORT="${REGISTRY_PORT:-5000}"
    REGISTRY="${REGISTRY_HOST}:${REGISTRY_PORT}"
    IMAGE_TAG="${IMAGE_TAG:-latest}"
    REMOTE_APP_DIR="${REMOTE_APP_DIR:-/opt/zplus-pos}"
    SERVER_SSH_PORT="${SERVER_SSH_PORT:-22}"
    
    # Validate required fields
    if [ -z "${SERVER_HOST:-}" ] || [ "$SERVER_HOST" = "your-server-ip" ]; then
        log_error "SERVER_HOST is not configured!"
        log_info "Edit deploy/.env.server.local and set SERVER_HOST"
        exit 1
    fi
}

# ==========================================
# SSH helper
# ==========================================
ssh_cmd() {
    local ssh_opts="-o StrictHostKeyChecking=no -o ConnectTimeout=10 -p ${SERVER_SSH_PORT}"
    
    if [ -n "${SERVER_SSH_KEY:-}" ] && [ -f "${SERVER_SSH_KEY}" ]; then
        ssh_opts="$ssh_opts -i ${SERVER_SSH_KEY}"
    fi
    
    # shellcheck disable=SC2086
    ssh $ssh_opts "${SERVER_USER}@${SERVER_HOST}" "$@"
}

scp_cmd() {
    local scp_opts="-o StrictHostKeyChecking=no -o ConnectTimeout=10 -P ${SERVER_SSH_PORT}"
    
    if [ -n "${SERVER_SSH_KEY:-}" ] && [ -f "${SERVER_SSH_KEY}" ]; then
        scp_opts="$scp_opts -i ${SERVER_SSH_KEY}"
    fi
    
    # shellcheck disable=SC2086
    scp $scp_opts "$@"
}

# ==========================================
# Test server connection
# ==========================================
test_connection() {
    log_step "Testing SSH connection to ${SERVER_USER}@${SERVER_HOST}:${SERVER_SSH_PORT}..."
    if ssh_cmd "echo 'OK'" &>/dev/null; then
        log_info "✅ SSH connection successful"
    else
        log_error "❌ Cannot connect to server. Check SSH config."
        exit 1
    fi
}

# ==========================================
# Setup server (first time)
# ==========================================
setup_server() {
    log_info "🔧 Setting up remote server: ${SERVER_HOST}"
    echo ""
    
    test_connection
    
    log_step "1/4 Installing Docker on server..."
    ssh_cmd 'bash -s' << 'SETUP_DOCKER'
set -e

# Check if Docker is already installed
if command -v docker &>/dev/null; then
    echo "Docker already installed: $(docker --version)"
else
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "Docker installed: $(docker --version)"
fi

# Ensure docker compose plugin
if docker compose version &>/dev/null; then
    echo "Docker Compose available: $(docker compose version)"
else
    echo "Installing Docker Compose plugin..."
    apt-get update && apt-get install -y docker-compose-plugin
fi
SETUP_DOCKER
    
    log_step "2/4 Creating project directory structure..."
    ssh_cmd "mkdir -p ${REMOTE_APP_DIR}/{nginx,migrations/mongodb,backups}"
    
    log_step "3/4 Uploading configuration files..."
    # Upload docker-compose, nginx, migrations, and .env
    scp_cmd "$SCRIPT_DIR/docker-compose.server.yml" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_APP_DIR}/docker-compose.yml"
    scp_cmd "$PROJECT_DIR/nginx/nginx.conf" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_APP_DIR}/nginx/nginx.conf"
    scp_cmd "$PROJECT_DIR/migrations/mongodb/init_indexes.js" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_APP_DIR}/migrations/mongodb/init_indexes.js"
    
    # Generate server .env from local .env + server config
    generate_server_env
    scp_cmd "/tmp/zplus-server-env" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_APP_DIR}/.env"
    rm -f /tmp/zplus-server-env
    
    log_step "4/4 Starting Docker Registry..."
    ssh_cmd "cd ${REMOTE_APP_DIR} && docker compose up -d registry"
    
    # Wait for registry
    sleep 3
    ssh_cmd "docker ps --filter name=zplus-registry --format '{{.Status}}'"
    
    log_step "Configuring local Docker to trust insecure registry..."
    configure_local_docker_insecure_registry
    
    echo ""
    log_info "✅ Server setup complete!"
    echo ""
    echo -e "  Registry: ${CYAN}${REGISTRY}${NC}"
    echo -e "  App dir:  ${CYAN}${REMOTE_APP_DIR}${NC}"
    echo ""
    log_info "Next: run 'make server-deploy' to build and deploy"
}

# ==========================================
# Generate .env for server
# ==========================================
generate_server_env() {
    local env_file="/tmp/zplus-server-env"
    
    # Start with the local .env (passwords etc.)
    cp "$PROJECT_DIR/.env" "$env_file"
    
    # Override/add server-specific vars
    local domain="${DOMAIN:-$SERVER_HOST}"
    
    # Update ALLOW_ORIGINS for the server domain
    if grep -q "^ALLOW_ORIGINS=" "$env_file"; then
        sed -i.bak "s|^ALLOW_ORIGINS=.*|ALLOW_ORIGINS=http://${domain},https://${domain}|" "$env_file"
    else
        echo "ALLOW_ORIGINS=http://${domain},https://${domain}" >> "$env_file"
    fi
    
    # Add registry config
    cat >> "$env_file" << EOF

# ==========================================
# Registry & Deploy (auto-generated)
# ==========================================
REGISTRY_HOST=${REGISTRY_HOST}
REGISTRY_PORT=${REGISTRY_PORT}
IMAGE_TAG=${IMAGE_TAG}
EOF
    
    rm -f "${env_file}.bak"
}

# ==========================================
# Configure local Docker for insecure registry
# ==========================================
configure_local_docker_insecure_registry() {
    local daemon_json
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - Docker Desktop
        daemon_json="$HOME/.docker/daemon.json"
    else
        daemon_json="/etc/docker/daemon.json"
    fi
    
    local registry="${REGISTRY}"
    
    # Check if already configured
    if [ -f "$daemon_json" ] && grep -q "$registry" "$daemon_json" 2>/dev/null; then
        log_info "Local Docker already configured for insecure registry: $registry"
        return
    fi
    
    log_warn "⚠️  You need to add the registry to Docker's insecure registries."
    echo ""
    echo -e "  ${YELLOW}For Docker Desktop (macOS):${NC}"
    echo "    1. Open Docker Desktop → Settings → Docker Engine"
    echo "    2. Add to the JSON config:"
    echo -e "       ${CYAN}\"insecure-registries\": [\"${registry}\"]${NC}"
    echo "    3. Click 'Apply & Restart'"
    echo ""
    echo -e "  ${YELLOW}For Linux:${NC}"
    echo "    1. Edit /etc/docker/daemon.json"
    echo "    2. Add: {\"insecure-registries\": [\"${registry}\"]}"
    echo "    3. Run: sudo systemctl restart docker"
    echo ""
    read -p "Press Enter when Docker is configured (or Ctrl+C to cancel)..."
}

# ==========================================
# Build and push images
# ==========================================
build_and_push() {
    local tag="${IMAGE_TAG}"
    local timestamp
    timestamp=$(date +%Y%m%d-%H%M%S)
    
    log_info "🔨 Building and pushing images to ${REGISTRY}..."
    echo ""
    
    # Build backend
    log_step "Building backend image..."
    docker build \
        -t "${REGISTRY}/zplus-backend:${tag}" \
        -t "${REGISTRY}/zplus-backend:${timestamp}" \
        -f "$PROJECT_DIR/backend/Dockerfile" \
        "$PROJECT_DIR/backend"
    
    # Build frontend
    log_step "Building frontend image..."
    docker build \
        --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-/api/v1}" \
        --build-arg NEXT_PUBLIC_WS_URL="${NEXT_PUBLIC_WS_URL:-/ws}" \
        --build-arg NEXT_PUBLIC_APP_NAME="${NEXT_PUBLIC_APP_NAME:-Zplus POS}" \
        -t "${REGISTRY}/zplus-frontend:${tag}" \
        -t "${REGISTRY}/zplus-frontend:${timestamp}" \
        -f "$PROJECT_DIR/frontend/Dockerfile" \
        "$PROJECT_DIR/frontend"
    
    # Push to registry
    log_step "Pushing backend image..."
    docker push "${REGISTRY}/zplus-backend:${tag}"
    docker push "${REGISTRY}/zplus-backend:${timestamp}"
    
    log_step "Pushing frontend image..."
    docker push "${REGISTRY}/zplus-frontend:${tag}"
    docker push "${REGISTRY}/zplus-frontend:${timestamp}"
    
    echo ""
    log_info "✅ Images pushed successfully!"
    echo -e "  Backend:  ${CYAN}${REGISTRY}/zplus-backend:${tag}${NC}"
    echo -e "  Frontend: ${CYAN}${REGISTRY}/zplus-frontend:${tag}${NC}"
    echo -e "  Backup:   ${CYAN}*:${timestamp}${NC}"
}

# ==========================================
# Deploy on server
# ==========================================
deploy_on_server() {
    log_step "Deploying on server..."
    
    # Upload latest configs
    scp_cmd "$SCRIPT_DIR/docker-compose.server.yml" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_APP_DIR}/docker-compose.yml"
    scp_cmd "$PROJECT_DIR/nginx/nginx.conf" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_APP_DIR}/nginx/nginx.conf"
    scp_cmd "$PROJECT_DIR/migrations/mongodb/init_indexes.js" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_APP_DIR}/migrations/mongodb/init_indexes.js"
    
    # Re-generate and upload .env
    generate_server_env
    scp_cmd "/tmp/zplus-server-env" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_APP_DIR}/.env"
    rm -f /tmp/zplus-server-env
    
    # Pull and restart on server
    ssh_cmd << EOF
cd ${REMOTE_APP_DIR}
echo "Pulling latest images..."
docker compose pull backend frontend
echo "Starting services..."
docker compose up -d
echo ""
echo "Service status:"
docker compose ps
EOF
}

# ==========================================
# Full deploy: build + push + deploy
# ==========================================
full_deploy() {
    log_info "🚀 Full deploy to ${SERVER_HOST}"
    echo ""
    
    test_connection
    build_and_push
    echo ""
    deploy_on_server
    
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✅ Deploy Complete!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
    
    local domain="${DOMAIN:-$SERVER_HOST}"
    local port="${APP_PORT:-80}"
    local url="http://${domain}"
    [ "$port" != "80" ] && url="${url}:${port}"
    
    echo -e "  🌐 App:     ${CYAN}${url}${NC}"
    echo -e "  🔑 Login:   ${CYAN}${url}/login${NC}"
    echo -e "  📡 API:     ${CYAN}${url}/api/v1${NC}"
    echo -e "  🏥 Health:  ${CYAN}${url}/health${NC}"
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
}

# ==========================================
# Server management commands
# ==========================================
server_status() {
    test_connection
    log_info "📊 Service status on ${SERVER_HOST}:"
    echo ""
    ssh_cmd "cd ${REMOTE_APP_DIR} && docker compose ps"
    echo ""
    
    local domain="${DOMAIN:-$SERVER_HOST}"
    local port="${APP_PORT:-80}"
    local url="http://${domain}"
    [ "$port" != "80" ] && url="${url}:${port}"
    
    log_info "Checking health..."
    if ssh_cmd "curl -sf http://localhost:${port}/health" &>/dev/null; then
        echo -e "  Backend API: ${GREEN}✅ Healthy${NC}"
    else
        echo -e "  Backend API: ${RED}❌ Unhealthy${NC}"
    fi
    
    if ssh_cmd "curl -sf http://localhost:${port}/ -o /dev/null" &>/dev/null; then
        echo -e "  Frontend:    ${GREEN}✅ Healthy${NC}"
    else
        echo -e "  Frontend:    ${RED}❌ Unhealthy${NC}"
    fi
    
    echo ""
    echo -e "  🌐 URL: ${CYAN}${url}${NC}"
}

server_logs() {
    local service="${2:-}"
    test_connection
    if [ -n "$service" ]; then
        ssh_cmd "cd ${REMOTE_APP_DIR} && docker compose logs -f --tail 100 ${service}"
    else
        ssh_cmd "cd ${REMOTE_APP_DIR} && docker compose logs -f --tail 50"
    fi
}

server_restart() {
    test_connection
    log_info "🔄 Restarting services on ${SERVER_HOST}..."
    ssh_cmd "cd ${REMOTE_APP_DIR} && docker compose restart"
    log_info "✅ Restarted!"
    echo ""
    server_status
}

server_stop() {
    test_connection
    log_info "🛑 Stopping services on ${SERVER_HOST}..."
    ssh_cmd "cd ${REMOTE_APP_DIR} && docker compose down"
    log_info "✅ Stopped!"
}

server_clean() {
    test_connection
    log_warn "⚠️  This will remove ALL containers, volumes, and data on the server!"
    read -p "Are you sure? (type 'yes' to confirm): " confirm
    if [ "$confirm" = "yes" ]; then
        ssh_cmd "cd ${REMOTE_APP_DIR} && docker compose down -v --rmi all"
        log_info "✅ Cleaned!"
    else
        log_info "Cancelled."
    fi
}

# ==========================================
# Backup databases on server
# ==========================================
server_backup() {
    test_connection
    local timestamp
    timestamp=$(date +%Y%m%d-%H%M%S)
    
    log_info "💾 Backing up databases on ${SERVER_HOST}..."
    
    ssh_cmd << EOF
cd ${REMOTE_APP_DIR}
mkdir -p backups

# PostgreSQL backup
echo "Backing up PostgreSQL..."
docker exec zplus-postgres pg_dump -U \$(grep PG_USER .env | cut -d= -f2) \$(grep PG_DATABASE .env | cut -d= -f2) | gzip > backups/postgres_${timestamp}.sql.gz

# MongoDB backup  
echo "Backing up MongoDB..."
docker exec zplus-mongodb mongodump --archive --gzip \
    -u \$(grep MONGO_USER .env | cut -d= -f2) \
    -p \$(grep MONGO_PASSWORD .env | cut -d= -f2) \
    --authenticationDatabase admin > backups/mongodb_${timestamp}.gz

echo "Backup files:"
ls -lh backups/*${timestamp}*
EOF
    
    log_info "✅ Backup complete!"
    
    # Optionally download backups
    read -p "Download backups to local? (y/N): " download
    if [ "$download" = "y" ] || [ "$download" = "Y" ]; then
        mkdir -p "$PROJECT_DIR/backups"
        scp_cmd "${SERVER_USER}@${SERVER_HOST}:${REMOTE_APP_DIR}/backups/*${timestamp}*" "$PROJECT_DIR/backups/"
        log_info "Downloaded to ./backups/"
    fi
}

# ==========================================
# Rollback to previous version
# ==========================================
server_rollback() {
    test_connection
    
    log_info "📋 Available image tags on server registry:"
    ssh_cmd << 'EOF'
echo ""
echo "Backend tags:"
curl -sf http://localhost:5000/v2/zplus-backend/tags/list 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "  (no tags or registry not running)"
echo ""
echo "Frontend tags:"
curl -sf http://localhost:5000/v2/zplus-frontend/tags/list 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "  (no tags or registry not running)"
EOF
    
    echo ""
    read -p "Enter the tag to rollback to (e.g., 20260304-153000): " rollback_tag
    
    if [ -z "$rollback_tag" ]; then
        log_error "No tag specified."
        exit 1
    fi
    
    log_info "Rolling back to tag: ${rollback_tag}..."
    ssh_cmd << EOF
cd ${REMOTE_APP_DIR}
# Update IMAGE_TAG in .env
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=${rollback_tag}/' .env
# Pull and restart
docker compose pull backend frontend
docker compose up -d backend frontend nginx
echo "Rollback complete!"
docker compose ps
EOF
    
    log_info "✅ Rolled back to ${rollback_tag}"
}

# ==========================================
# Open SSH session
# ==========================================
open_ssh() {
    log_info "Opening SSH to ${SERVER_HOST}..."
    ssh_cmd
}

# ==========================================
# Main
# ==========================================
load_config

case "${1:-deploy}" in
    setup)    setup_server ;;
    deploy)   full_deploy ;;
    push)     test_connection && build_and_push ;;
    pull)     test_connection && deploy_on_server ;;
    status)   server_status ;;
    logs)     server_logs "$@" ;;
    restart)  server_restart ;;
    stop)     server_stop ;;
    clean)    server_clean ;;
    backup)   server_backup ;;
    rollback) server_rollback ;;
    ssh)      open_ssh ;;
    *)
        echo -e "${BLUE}Zplus POS - Remote Server Deploy${NC}"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  setup      First-time server setup (install Docker & Registry)"
        echo "  deploy     Build, push, and deploy to server (default)"
        echo "  push       Build and push images only"
        echo "  pull       Pull latest images and restart on server"
        echo "  status     Show service status on server"
        echo "  logs       View logs (optional: logs <service>)"
        echo "  restart    Restart services on server"
        echo "  stop       Stop all services on server"
        echo "  clean      Remove everything on server"
        echo "  backup     Backup databases on server"
        echo "  rollback   Rollback to previous version"
        echo "  ssh        Open SSH session to server"
        exit 1
        ;;
esac
