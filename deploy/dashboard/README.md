# Dashboard privé (`/opt/dashboard`, dashboard.mathis-rvrs.fr)

Portail privé regroupant **Stats**, **Poker** (liens vers le site public `mathis-rvrs.fr`) et
**Security** (UI des rapports produits par `security/scan.sh`). Node sans dépendance.

Protégé par le Caddy frontal via le snippet `private` (`deploy/edge`) : l'authentification est faite
en amont par `deploy/auth`, le compte connecté arrive dans `X-Auth-User`. Ce service ne gère ni mot
de passe ni session.

| Route | Rôle |
|---|---|
| `/` | Cartes Stats / Poker / Security. |
| `/security` | Formulaire de lancement + liste des scans (`REPORTS_DIR/*`), triés par date. |
| `POST /security/scan` | Lance un scan (champ URL + case d'autorisation). Même origine exigée. |
| `/security/<scan>` | Rapport `report.md` rendu + liens vers fichiers bruts. |
| `/security/<scan>/raw/<fichier>` | Fichier brut (rapport ZAP HTML, nuclei, testssl…). |
| `/health` | État JSON. |

## Lancer un scan (depuis le web)

Sur `/security` : entrer l'URL cible, cliquer **Scanner**. Le scan (passif) tourne en tâche de fond
quelques minutes puis apparaît dans la liste. N'utiliser que sur des sites possédés ou autorisés
(rappel non bloquant affiché sous le champ).

Mécanique : `scan.sh` (embarqué dans l'image) orchestre les outils comme conteneurs **frères** via
le socket Docker ; ils écrivent dans le volume nommé `dashboard-reports` (sous-dossier par scan).
`sqlmap` reste une étape manuelle (voir `security/README.md`).

> Sécurité : le conteneur monte `/var/run/docker.sock` (privilège équivalent root sur l'hôte) et
> tourne en root. Il n'est accessible que derrière le login de l'espace privé (`deploy/auth`).

## Variables

| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `8300` | Port d'écoute. |
| `REPORTS_DIR` | `/reports` | Dossier des rapports de scan (monté en lecture seule). |
| `STATS_URL` | `https://mathis-rvrs.fr/stats` | Lien carte Stats. |
| `POKER_URL` | `https://mathis-rvrs.fr/poker` | Lien carte Poker. |

## Tests

```bash
node --test deploy/dashboard/test/*.test.mjs
```

## Déployer

`scan.sh` est embarqué dans l'image : le copier dans le contexte de build (`/opt/dashboard`).

```bash
# Depuis ce dépôt
scp deploy/dashboard/{Dockerfile,docker-compose.yml,server.mjs} deploy@185.226.172.52:/opt/dashboard/
scp security/scan.sh deploy@185.226.172.52:/opt/dashboard/scan.sh
# Sur le serveur
cd /opt/dashboard && docker compose up -d --build --wait
```

Prérequis : réseau `edge` déjà créé (pile `deploy/edge`), DNS `dashboard.mathis-rvrs.fr` →
185.226.172.52, entrée `dashboard.caddy` ajoutée au frontal, et `Dashboard=…` dans `AUTH_APPS`
(`deploy/auth`). Voir `deploy/edge/README.md` et `deploy/auth/README.md`.
