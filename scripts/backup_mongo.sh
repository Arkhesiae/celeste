#!/bin/bash

# === Configuration ===
DATE=$(date +\%Y-\%m-\%d)
BACKUP_DIR="/root/celeste/mongo_backups/$DATE"
MONGO_URI="mongodb://root:randomString@localhost:27017/myDb?authSource=admin"

# === Crée le dossier de backup ===
mkdir -p "$BACKUP_DIR"
echo "Creating backup in $BACKUP_DIR"
# === Sauvegarde MongoDB ===
mongodump --uri="$MONGO_URI" --out="$BACKUP_DIR"

# === Supprime les backups de plus de 30 jours ===
find /root/celeste/mongo_backups/ -type d -mtime +365 -exec rm -rf {} \;
