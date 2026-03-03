#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: ./scripts/restore.sh <backup_file.tar.gz>"
    echo "Example: ./scripts/restore.sh ./backups/backup_20260303_120000.tar.gz"
    exit 1
fi

BACKUP_FILE=$1
RESTORE_DIR="./backups/restore_tmp"

echo "♻️  Restoring from ${BACKUP_FILE}..."

mkdir -p "${RESTORE_DIR}"
tar -xzf "${BACKUP_FILE}" -C "${RESTORE_DIR}"

# Find the extracted directory
EXTRACTED_DIR=$(ls "${RESTORE_DIR}")

# PostgreSQL
PG_DUMP=$(find "${RESTORE_DIR}/${EXTRACTED_DIR}" -name "postgresql_*.dump" | head -1)
if [ -n "$PG_DUMP" ]; then
    echo "📊 Restoring PostgreSQL..."
    docker cp "${PG_DUMP}" zplus-postgres:/tmp/restore.dump
    docker exec zplus-postgres pg_restore \
        -U "${PG_USER:-zplus_user}" \
        -d "${PG_DATABASE:-zplus_pos}" \
        --clean --if-exists \
        /tmp/restore.dump || true
    echo "✅ PostgreSQL restored"
fi

# MongoDB
MONGO_DIR="${RESTORE_DIR}/${EXTRACTED_DIR}/mongodb"
if [ -d "$MONGO_DIR" ]; then
    echo "📄 Restoring MongoDB..."
    docker cp "${MONGO_DIR}" zplus-mongodb:/tmp/mongodb_restore
    docker exec zplus-mongodb mongorestore \
        --username="${MONGO_USER:-zplus_user}" \
        --password="${MONGO_PASSWORD:-zplus_secret}" \
        --authenticationDatabase=admin \
        --db="${MONGO_DATABASE:-zplus_pos}" \
        --drop \
        /tmp/mongodb_restore/"${MONGO_DATABASE:-zplus_pos}"
    echo "✅ MongoDB restored"
fi

# Redis
REDIS_DUMP=$(find "${RESTORE_DIR}/${EXTRACTED_DIR}" -name "redis_*.rdb" | head -1)
if [ -n "$REDIS_DUMP" ]; then
    echo "🔴 Restoring Redis..."
    docker exec zplus-redis redis-cli -a "${REDIS_PASSWORD:-zplus_secret}" SHUTDOWN NOSAVE || true
    sleep 2
    docker cp "${REDIS_DUMP}" zplus-redis:/data/dump.rdb
    docker start zplus-redis
    echo "✅ Redis restored"
fi

rm -rf "${RESTORE_DIR}"

echo ""
echo "============================================"
echo "✅ Restore complete!"
echo "============================================"
