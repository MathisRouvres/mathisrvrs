#!/usr/bin/env bash
# Crée (ou recrée le mot de passe de) la base et l'utilisateur d'un dashboard, droits limités à sa
# base, et écrit DATABASE_URL dans le .env de l'app (droits 600). Idempotent.
#   bash /opt/db/create-app-db.sh travaux /opt/travaux/.env
set -euo pipefail

usage="usage : create-app-db.sh <app> <fichier .env de l'app>"
app="${1:?$usage}"
env_file="${2:?$usage}"
[[ "$app" =~ ^[a-z][a-z0-9_]{1,30}$ ]] || { echo "nom d'app invalide : $app" >&2; exit 1; }

cd "$(dirname "$0")"
password="$(openssl rand -hex 24)"

docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot' <<SQL
CREATE DATABASE IF NOT EXISTS \`$app\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS '$app'@'%' IDENTIFIED BY '$password';
ALTER USER '$app'@'%' IDENTIFIED BY '$password';
GRANT ALL PRIVILEGES ON \`$app\`.* TO '$app'@'%';
FLUSH PRIVILEGES;
SQL

url="mysql://$app:$password@mysql:3306/$app"
touch "$env_file"
chmod 600 "$env_file"
if grep -q '^DATABASE_URL=' "$env_file"; then
  sed -i "s#^DATABASE_URL=.*#DATABASE_URL=$url#" "$env_file"
else
  printf 'DATABASE_URL=%s\n' "$url" >>"$env_file"
fi
echo "Base $app prête ; DATABASE_URL écrit dans $env_file."
