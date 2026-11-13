# Dashboard privé (`/opt/dashboard`, dashboard.mathis-rvrs.fr)

Portail privé regroupant **Stats**, **Poker** (liens vers le site public `mathis-rvrs.fr`) et
**Security** (UI des rapports produits par `security/scan.sh`). Node sans dépendance.

Protégé par le Caddy frontal via le snippet `private` (`deploy/edge`) : l'authentification est faite
en amont par `deploy/auth`, le compte connecté arrive dans `X-Auth-User`. Ce service ne gère ni mot
de passe ni session.

| Route | Rôle |
|---|---|
| `/` | Cartes Stats / Poker / Security. |
| `/security` | Liste des scans (`REPORTS_DIR/*`), triés par date, compteurs findings. |
| `/security/<scan>` | Rapport `report.md` rendu + liens vers fichiers bruts. |
| `/security/<scan>/raw/<fichier>` | Fichier brut (rapport ZAP HTML, nuclei, testssl…). |
| `/health` | État JSON. |

## Variables

| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `8300` | Port d'écoute. |
| `REPORTS_DIR` | `/reports` | Dossier des rapports de scan (monté en lecture seule). |
| `STATS_URL` | `https://mathis-rvrs.fr/stats` | Lien carte Stats. |
| `POKER_URL` | `https://mathis-rvrs.fr/poker` | Lien carte Poker. |

## Alimenter la section Security

Les rapports sont ceux de `security/scan.sh`. Pour qu'ils apparaissent dans le dashboard, lancer le
scan en écrivant dans le volume `dashboard-reports` (monté par le dashboard). Depuis le dépôt sur le
serveur :

```bash
# chemin du volume dashboard-reports sur l'hôte
VOL=$(docker volume inspect dashboard_dashboard-reports -f '{{.Mountpoint}}')
sudo SCAN_OUTPUT_DIR="$VOL" ./security/scan.sh https://exemple.com --i-am-authorized
```

`scan.sh` écrit alors dans `$VOL/<host>-<timestamp>/` ; le dashboard le liste aussitôt.

## Tests

```bash
node --test deploy/dashboard/test/*.test.mjs
```

## Déployer

```bash
# Depuis ce dépôt
scp deploy/dashboard/{Dockerfile,docker-compose.yml,server.mjs} deploy@185.226.172.52:/opt/dashboard/
# Sur le serveur
cd /opt/dashboard && docker compose up -d --build --wait
```

Prérequis : réseau `edge` déjà créé (pile `deploy/edge`), DNS `dashboard.mathis-rvrs.fr` →
185.226.172.52, entrée `dashboard.caddy` ajoutée au frontal, et `Dashboard=…` dans `AUTH_APPS`
(`deploy/auth`). Voir `deploy/edge/README.md` et `deploy/auth/README.md`.
