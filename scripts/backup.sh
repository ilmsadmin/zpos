#!/bin/bash
set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/${DATE}"

mkdir -p "${BACKUP_DIR}"

echo "💾 Starting backup at ${DATE}..."

# PostgreSQL
echo "📊 Backing up PostgreSQL..."
docker exec zplus-postgres pg_dump \
    -U "${PG_USER:-zplus_user}" \
    -d "${PG_DATABASE:-zplus_pos}" \
    -F c \
    -f /tmp/postgresql_backup.dump

docker cp zplus-postgres:/tmp/postgresql_backup.dump "${BACKUP_DIR}/postgresql_${DATE}.dump"
echo "✅ PostgreSQL backup complete"

# MongoDB
echo "📄 Backing up MongoDB..."
docker exec zplus-mongodb mongodump \
    --username="${MONGO_USER:-zplus_user}" \
    --password="${MONGO_PASSWORD:-zplus_secret}" \
    --authenticationDatabase=admin \
    --db="${MONGO_DATABASE:-zplus_pos}" \
    --out=/tmp/mongodb_backup

docker cp zplus-mongodb:/tmp/mongodb_backup "${BACKUP_DIR}/mongodb/"
echo "✅ MongoDB backup complete"

# Redis
echo "🔴 Backing up Redis..."
docker exec zplus-redis redis-cli -a "${REDIS_PASSWORD:-zplus_secret}" BGSAVE
sleep 2
docker cp zplus-redis:/data/dump.rdb "${BACKUP_DIR}/redis_${DATE}.rdb"
echo "✅ Redis backup complete"

# Compress
echo "📦 Compressing backup..."
tar -czf "./backups/backup_${DATE}.tar.gz" -C "./backups" "${DATE}"
rm -rf "${BACKUP_DIR}"

echo ""
echo "============================================"
echo "✅ Backup complete!"
echo "📁 File: ./backups/backup_${DATE}.tar.gz"
echo "============================================"
