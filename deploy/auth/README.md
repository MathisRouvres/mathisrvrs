# Connexion de l'espace privé (`/opt/auth`, auth.mathis-rvrs.fr)

Un seul compte : mot de passe + code TOTP. Le Caddy frontal protège `pma.`, `travaux.`,
`arbitre.` et `job.mathis-rvrs.fr` par `forward_auth` (snippet `private`) : chaque requête passe
par `GET /verify` (200 si session valide, sinon redirection vers `/login`, 401 hors GET/HEAD).

- Session de 30 jours, cookie `__Secure-mr_session` (domaine `mathis-rvrs.fr`, HttpOnly, Secure,
  SameSite=Lax), signé HMAC-SHA256 ; une connexion vaut pour tous les sous-domaines.
- Mot de passe en scrypt ; code TOTP à 6 chiffres (±30 s), un code ne sert qu'une fois.
- 5 échecs par IP ou 30 au total en 15 min → 429. Formulaires : même origine exigée.
- Aucune dépendance (`lib.mjs`, `server.mjs`) ; tests : `node --test test/*.test.mjs`.

## Commandes (sur le serveur, dans `/opt/auth`)

```bash
docker compose run --rm -it web node setup.mjs           # compte : mot de passe + QR code TOTP
docker compose run --rm -it web node setup.mjs password  # changer le mot de passe
docker compose run --rm web node setup.mjs revoke        # déconnecter toutes les sessions
docker compose logs web | grep connexion                 # connexions et échecs (avec IP)
```

`config/credentials.json` (600) est relu sans redémarrage. Le perdre bloque l'accès aux
dashboards (pas les données) : relancer `setup.mjs`.
