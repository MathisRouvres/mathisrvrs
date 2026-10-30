#!/usr/bin/env bash
# Sauvegarde nocturne de toutes les bases MySQL (crontab de deploy, 3 h 50) :
#   50 3 * * * bash /opt/db/backup.sh >> /opt/db/backups/backup.log 2>&1
# Dump cohérent sans verrou (--single-transaction, InnoDB), compressé ; 14 jours gardés.
set -euo pipefail

cd "$(dirname "$0")"
mkdir -p backups
chmod 700 backups
out="backups/mysql-$(date +%Y%m%d-%H%M).sql.gz"

docker compose exec -T mysql sh -c \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -uroot --all-databases --single-transaction --routines --events --triggers' \
  | gzip -9 >"$out.tmp"
mv "$out.tmp" "$out"
chmod 600 "$out"
find backups -name 'mysql-*.sql.gz' -mtime +14 -delete
echo "$(date -Is) $out $(du -h "$out" | cut -f1)"
