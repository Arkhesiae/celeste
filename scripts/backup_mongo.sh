#!/bin/bash

# === Configuration ===

DATE=$(date +\%Y-\%m-\%d)
BACKUP_DIR="/backups/$DATE"
MONGO_URI="${MONGO_URI}"

# === Crée le dossier de backup ===

mkdir -p "$BACKUP_DIR"
echo "Creating backup in $BACKUP_DIR"
# === Sauvegarde MongoDB ===

mongodump --uri="$MONGO_URI" --out="$BACKUP_DIR"

# === Supprime les backups de plus de 30 jours ===

find /backups/ -type d -mtime +365 -exec rm -rf {} \;
