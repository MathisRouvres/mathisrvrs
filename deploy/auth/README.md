# Connexion de l'espace privé (`/opt/auth`, auth.mathis-rvrs.fr)

Plusieurs comptes : identifiant + mot de passe + code TOTP, chacun limité à une liste d'hôtes
(`*` = tous). Le Caddy frontal protège `pma.`, `travaux.`, `arbitre.`, `job.` et `budget.mathis-rvrs.fr`
par `forward_auth` (snippet `private`) : chaque requête passe par `GET /verify`, qui lit l'hôte
demandé (`X-Forwarded-Host`) et répond :

- 200 avec `X-Auth-User: <compte>` si la session est valide et l'hôte autorisé pour ce compte ;
  Caddy transmet cet en-tête au site (et retire celui qu'enverrait un client) ;
- 403 si l'hôte est hors du périmètre du compte (ex. `couple` sur `pma.`) ;
- sinon redirection vers `/login` (GET/HEAD) ou 401.

| Compte | Accès |
|---|---|
| `mathis` | `*` (tous les sites) |
| `couple` | `budget.mathis-rvrs.fr` (login partagé Mathis + Isis) |

- Session de 30 jours, cookie `__Secure-mr_session` (domaine `mathis-rvrs.fr`, HttpOnly, Secure,
  SameSite=Lax), signé HMAC-SHA256, porte le compte (`u`) et son époque (`e`).
- Mot de passe en scrypt ; code TOTP à 6 chiffres (±30 s), un code ne sert qu'une fois par compte.
- 5 échecs par IP ou 30 au total en 15 min → 429. Formulaires : même origine exigée.
- Aucune dépendance (`lib.mjs`, `server.mjs`) ; tests : `node --test test/*.test.mjs`.

## Commandes (sur le serveur, dans `/opt/auth`)

```bash
docker compose run --rm -it web node setup.mjs                    # compte mathis : mot de passe + QR code TOTP
docker compose run --rm -it web node setup.mjs add couple --hosts budget.mathis-rvrs.fr   # nouveau compte limité
docker compose run --rm -it web node setup.mjs reset couple       # mot de passe + nouveau TOTP d'un compte
docker compose run --rm -it web node setup.mjs password [compte]  # changer le mot de passe (mathis par défaut)
docker compose run --rm web node setup.mjs hosts couple budget.mathis-rvrs.fr,autre.mathis-rvrs.fr
docker compose run --rm web node setup.mjs revoke [compte]        # déconnecter un compte, ou tous
docker compose run --rm web node setup.mjs remove couple          # supprimer un compte
docker compose run --rm web node setup.mjs list                   # comptes et hôtes
docker compose logs web | grep -E 'connexion|accès refusé'        # connexions, échecs, refus (avec IP)
```

`config/credentials.json` (600) est relu sans redémarrage :

```json
{ "sessionSecret": "…", "accounts": { "mathis": { "passwordHash": "scrypt$…", "totpSecret": "…",
  "epoch": 1, "lastTotpStep": 0, "hosts": ["*"] } } }
```

L'ancien format (un seul compte, champs à la racine) est lu comme le compte `mathis` avec accès
partout, mêmes secrets et même époque : les sessions en cours restent valides. Le fichier est
réécrit au nouveau format à la première connexion ou commande `setup.mjs`. Un jeton émis avant
les comptes (sans `u`) vaut pour `mathis`.

Perdre le fichier bloque l'accès aux dashboards (pas les données) : relancer `setup.mjs`.

## Déployer

```bash
# Depuis ce dépôt
scp deploy/auth/{Dockerfile,docker-compose.yml,lib.mjs,server.mjs,setup.mjs} deploy@185.226.172.52:/opt/auth/
# Sur le serveur
cd /opt/auth && cp -p config/credentials.json "config/credentials.json.bak-$(date +%F)"
docker compose up -d --build --wait
```

Retour à une version d'avant les comptes : remettre aussi la sauvegarde de `credentials.json`
(l'ancienne version ne lit pas le nouveau format).
