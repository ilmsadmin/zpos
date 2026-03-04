# Zplus POS - Deploy to Remote Server via Docker Registry

## Architecture

```
┌─────────────────────┐         ┌──────────────────────────────────────┐
│  LOCAL (Mac/Dev)     │         │  REMOTE SERVER                       │
│                      │         │                                      │
│  Build Images ───────┼── Push ─┼──► Docker Registry (:5000)           │
│  (backend, frontend) │         │       │                              │
│                      │         │       ├── Pull ──► Backend (:8080)   │
│                      │         │       ├── Pull ──► Frontend (:3000)  │
│                      │         │       │                              │
│                      │         │       ├── PostgreSQL (:5432)         │
│                      │         │       ├── MongoDB (:27017)           │
│                      │         │       ├── Redis (:6379)              │
│                      │         │       ├── MinIO (:9000)              │
│                      │         │       ├── NATS (:4222)               │
│                      │         │       └── Nginx (:80/:443)           │
└─────────────────────┘         └──────────────────────────────────────┘
```

## Quick Start

### 1. Configure
```bash
cp deploy/.env.server deploy/.env.server.local
# Edit deploy/.env.server.local with your server info
nano deploy/.env.server.local
```

### 2. Setup Server (first time only)
```bash
make server-setup
```

### 3. Deploy
```bash
make server-deploy
```

### 4. Check Status
```bash
make server-status
make server-logs
```

## Commands

| Command               | Description                           |
|-----------------------|---------------------------------------|
| `make server-setup`   | First-time server setup               |
| `make server-deploy`  | Build, push, and deploy to server     |
| `make server-status`  | Check service status on server        |
| `make server-logs`    | View server logs                      |
| `make server-restart` | Restart services on server            |
| `make server-stop`    | Stop all services on server           |
| `make server-clean`   | Remove everything on server           |
| `make server-backup`  | Backup databases on server            |
| `make server-rollback`| Rollback to previous version          |

## Configuration

Edit `deploy/.env.server.local`:

```bash
# Server connection
SERVER_HOST=your-server-ip
SERVER_USER=your-ssh-user
SERVER_SSH_KEY=~/.ssh/id_rsa    # or leave empty for password auth
SERVER_SSH_PORT=22

# Registry
REGISTRY_HOST=your-server-ip
REGISTRY_PORT=5000

# Domain
DOMAIN=your-domain.com          # or server IP for direct access

# App Port
APP_PORT=80
```
