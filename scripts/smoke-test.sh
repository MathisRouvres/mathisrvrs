#!/usr/bin/env bash
# Contrôle d'un site déployé (appelé par .github/workflows/deploy.yml) : la page d'accueil doit
# référencer le build de dist/, chaque fichier JS/CSS doit être servi avec le bon type (sinon :
# écran blanc) et les routes principales doivent répondre.
#
# Usage : scripts/smoke-test.sh <url> [options curl…]
#   options curl : par exemple --resolve mathis-rvrs.fr:443:<IP> -k pour viser un serveur
#   précis avant la bascule DNS.
set -u

site_url="$1"
shift
curl_opts=("$@")

expected=$(grep -oE 'assets/index-[^"]+\.js' dist/index.html | head -1)
echo "Build attendu sur $site_url : $expected"
for attempt in 1 2 3 4 5 6; do
  if curl -fsS "${curl_opts[@]}" "$site_url/?deploy=${GITHUB_SHA:-local}" | grep -q "$expected"; then
    echo "index.html à jour"
    break
  fi
  if [ "$attempt" = 6 ]; then
    echo "::error::$site_url ne sert pas le nouveau build ($expected)"
    exit 1
  fi
  sleep 10
done

failed=0
for file in dist/assets/*.js dist/assets/*.css; do
  path="/assets/$(basename "$file")"
  type=$(curl -sS "${curl_opts[@]}" -o /dev/null -w '%{http_code} %{content_type}' "$site_url$path")
  case "$file" in
    *.js) want=javascript ;;
    *.css) want=css ;;
  esac
  if ! echo "$type" | grep -q "^200 .*$want"; then
    echo "::error::$path servi en « $type »"
    failed=1
  fi
done

for route in / /games /games/soiree /monovomy /carriere /spin /catan/; do
  code=$(curl -sS "${curl_opts[@]}" -o /dev/null -w '%{http_code}' "$site_url$route")
  echo "$route -> $code"
  [ "$code" = 200 ] || { echo "::error::$route répond $code"; failed=1; }
done

exit $failed
