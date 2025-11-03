#!/bin/bash

# Database Backup Script for YouAndINotAI Platform
# ============================================================================

set -e

# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
else
    echo "❌ Error: .env file not found"
    exit 1
fi

# Configuration
BACKUP_DIR="./backups"
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-youandinotai_prod}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting database backup..."
echo "   Database: $DB_NAME"
echo "   Timestamp: $TIMESTAMP"

# Create backup
docker-compose exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    # Compress backup
    gzip "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    
    # Get file size
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    
    echo "✅ Backup completed successfully"
    echo "   File: $BACKUP_FILE"
    echo "   Size: $FILE_SIZE"
    
    # Keep only last 30 backups
    echo ""
    echo "🧹 Cleaning old backups (keeping last 30)..."
    ls -t "${BACKUP_DIR}"/backup_*.sql.gz | tail -n +31 | xargs -r rm
    
    BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/backup_*.sql.gz 2>/dev/null | wc -l)
    echo "   Backups retained: $BACKUP_COUNT"
    
else
    echo "❌ Backup failed"
    rm -f "$BACKUP_FILE"
    exit 1
fi

echo ""
echo "💡 To restore this backup:"
echo "   gunzip $BACKUP_FILE"
echo "   docker-compose exec -T postgres psql -U $DB_USER -d $DB_NAME < ${BACKUP_FILE%.gz}"
echo ""
