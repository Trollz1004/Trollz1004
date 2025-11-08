#!/bin/bash

# ============================================
# Complete Backup Script
# Backs up databases, configs, and code
# ============================================

BACKUP_DIR="/home/user/Trollz1004/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "=== BACKUP STARTING ==="
echo "Location: $BACKUP_DIR"
echo ""

# Backup PostgreSQL
if command -v pg_dump &> /dev/null; then
    echo "Backing up PostgreSQL databases..."
    pg_dump -U postgres youandinotai_prod > "$BACKUP_DIR/youandinotai_prod.sql" 2>/dev/null && echo "✅ youandinotai_prod"
    pg_dump -U postgres cloudedroid_prod > "$BACKUP_DIR/cloudedroid_prod.sql" 2>/dev/null && echo "✅ cloudedroid_prod"
fi

# Backup .env files
echo "Backing up configuration files..."
cp .env "$BACKUP_DIR/.env" 2>/dev/null && echo "✅ .env"
cp cloudedroid-production/.env "$BACKUP_DIR/cloudedroid.env" 2>/dev/null && echo "✅ cloudedroid.env"

# Backup JWT keys
echo "Backing up JWT keys..."
cp jwtRS256.key* "$BACKUP_DIR/" 2>/dev/null && echo "✅ JWT keys"

# Backup uploads
if [ -d "uploads" ]; then
    echo "Backing up user uploads..."
    tar -czf "$BACKUP_DIR/uploads.tar.gz" uploads && echo "✅ Uploads"
fi

# Backup logs
if [ -d "/var/log/youandinotai" ]; then
    echo "Backing up logs..."
    tar -czf "$BACKUP_DIR/logs.tar.gz" /var/log/youandinotai 2>/dev/null && echo "✅ Logs"
fi

# Create backup info file
cat > "$BACKUP_DIR/backup-info.txt" << EOF
Backup Date: $(date)
Hostname: $(hostname)
System: $(uname -a)

Backed up:
- PostgreSQL databases
- Configuration files
- JWT keys
- User uploads
- Application logs

Restore instructions:
1. Restore databases: psql -U postgres -d youandinotai_prod < youandinotai_prod.sql
2. Restore configs: cp .env /home/user/Trollz1004/.env
3. Restore JWT keys: cp jwtRS256.key* /home/user/Trollz1004/
4. Restart services
EOF

echo ""
echo "✅ Backup complete!"
echo "Location: $BACKUP_DIR"
echo ""

# Cleanup old backups (keep last 7 days)
echo "Cleaning up old backups..."
find /home/user/Trollz1004/backups/ -type d -mtime +7 -exec rm -rf {} + 2>/dev/null
echo "✅ Old backups cleaned"
echo ""
