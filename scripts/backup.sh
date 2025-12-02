#!/bin/bash

# Configuration
CONTAINER_NAME="css_mongo"
DB_NAME="css_auth_container"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="mongo_backup_$TIMESTAMP"

# Create backup directory
mkdir -p $BACKUP_DIR

# Run mongodump inside the container
echo "Starting backup for $DB_NAME..."
docker exec $CONTAINER_NAME mongodump --authenticationDatabase admin --username admin --password password123 --db $DB_NAME --out /tmp/dump

# Copy backup from container to host
docker cp $CONTAINER_NAME:/tmp/dump/$DB_NAME $BACKUP_DIR/$FILENAME

# Clean up inside container
docker exec $CONTAINER_NAME rm -rf /tmp/dump

# Zip it
tar -czvf $BACKUP_DIR/$FILENAME.tar.gz -C $BACKUP_DIR $FILENAME
rm -rf $BACKUP_DIR/$FILENAME

echo "Backup completed successfully: $BACKUP_DIR/$FILENAME.tar.gz"

# Basic Retention Policy (Delete older than 7 days)
find $BACKUP_DIR -type f -name "*.tar.gz" -mtime +7 -delete
