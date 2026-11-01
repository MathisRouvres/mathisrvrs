# Caddy frontal du VPS (`/opt/edge`)

Le VPS (185.226.172.52) héberge plusieurs piles Docker. Une seule peut publier 80/443 : ce Caddy
frontal. Il termine le HTTPS de tous les sites et relaie chacun vers son conteneur par le réseau
Docker `edge`. Aucune autre pile ne publie de port.

| Fichier | Rôle |
|---|---|
| `docker-compose.yml` | Le frontal. Crée le réseau `edge` (les autres piles le déclarent `external`). |
| `Caddyfile` | Eskudo (`club-web:80`) et ses redirections ; `import sites/*.caddy` pour les sites suivants. |
| `sites/` | Un fichier `.caddy` par site ajouté (mathis-rvrs.fr, dashboards). |
| `club.override.yml` | Copié en `/opt/club/docker-compose.override.yml` : club-web sans port, en HTTP, sur `edge`. |
| `.env.example` | Variables à copier en `/opt/edge/.env`. |

## Mettre à jour la configuration

Valider la nouvelle config dans le conteneur avant de la mettre en place, puis recharger (aucune
coupure) :

```bash
# Depuis ce dépôt
ssh deploy@185.226.172.52 'rm -rf /opt/edge/next && mkdir /opt/edge/next'
scp -r deploy/edge/{Caddyfile,sites} deploy@185.226.172.52:/opt/edge/next/
# Sur le serveur
cd /opt/edge && docker compose cp next/. caddy:/tmp/next
docker compose exec caddy caddy validate --config /tmp/next/Caddyfile --adapter caddyfile
cp next/Caddyfile Caddyfile && cp next/sites/*.caddy sites/ && rm -r next
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

## Espace privé (`sites/private.caddy`)

Les sites qui font `import private` passent par le service de connexion (`deploy/auth`). Le site
reçoit le compte connecté dans `X-Auth-User` ; un `X-Auth-User` envoyé par le client est retiré
avant, il ne peut pas être forgé. Un compte hors de son périmètre reçoit un 403.

## IP réelle des joueurs

L'API d'Eskudo limite par IP (`trustProxy: true`, IP la plus à gauche de `X-Forwarded-For`).
Le Caddy de club-web fait confiance aux IP privées (`trusted_proxies static private_ranges`,
`deploy/Caddyfile` de ClubAscent) : il garde le `X-Forwarded-For` posé par le frontal. Le
frontal, lui, ne fait confiance à personne : un `X-Forwarded-For` envoyé par un client est
remplacé par sa vraie IP.

## Bascule d'Eskudo derrière le frontal

Prérequis : l'image web d'Eskudo en service contient `SITE_SCHEME` et `trusted_proxies`
(`docker exec club-web-1 grep -c SITE_SCHEME /etc/caddy/Caddyfile` → `1`).

```bash
# Depuis ce dépôt
ssh deploy@185.226.172.52 'sudo install -d -o deploy -g deploy /opt/edge'
scp -r deploy/edge/{docker-compose.yml,Caddyfile,sites,.env.example,club.override.yml} deploy@185.226.172.52:/opt/edge/

# Sur le serveur (ssh deploy@185.226.172.52)
cd /opt/edge && cp .env.example .env && chmod 600 .env
docker compose create                       # réseau edge + conteneur, sans démarrer
# Certificats d'Eskudo repris tels quels : aucun redemandé à Let's Encrypt.
docker run --rm -v club_caddy-data:/from:ro -v edge_caddy-data:/to alpine cp -a /from/. /to/

# Coupure (~15 s) : club-web lâche 80/443, le frontal les prend.
cp /opt/edge/club.override.yml /opt/club/docker-compose.override.yml
(cd /opt/club && docker compose up -d --wait web)
docker compose up -d --wait

# Contrôles
curl -sI https://eskudo.fr/ | grep -iE '^HTTP|content-security'
curl -s https://eskudo.fr/api/health
curl -sI https://www.eskudo.fr/ | grep -i '^location'
```

Retour arrière (club-web reprend 80/443) :

```bash
cd /opt/edge && docker compose stop
rm /opt/club/docker-compose.override.yml
(cd /opt/club && docker compose up -d --wait web)
```

Les déploiements d'Eskudo (`deploy.sh`) n'y changent rien : ils recopient seulement
`docker-compose.yml` et `deploy.sh`, et `docker compose` recharge l'override à chaque fois.

## Tester en local

```bash
printf 'ACME_EMAIL=t@example.com\nCLUB_SITE=eskudo.localhost\nCLUB_ALIASES=www.eskudo.localhost\nHTTP_PORT=18080\nHTTPS_PORT=18443\n' > /tmp/edge.env
docker compose -p edgetest --env-file /tmp/edge.env up -d --wait
# brancher un conteneur « club-web » sur le réseau edge : docker network connect --alias club-web edge <id>
curl -k --resolve eskudo.localhost:18443:127.0.0.1 https://eskudo.localhost:18443/
docker compose -p edgetest --env-file /tmp/edge.env down -v
```
