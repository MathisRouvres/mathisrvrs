# mathis-rvrs.fr sur le VPS (`/opt/site`)

FrankenPHP (Caddy + PHP) sert `dist/` et `contact.php` sur le réseau Docker `edge`, derrière le
Caddy frontal (`deploy/edge`, site `sites/mathis-rvrs.caddy`). Le `Caddyfile` reprend les règles
des `.htaccess` d'Apache (fallback SPA, cache, service worker MonoVomy, HEXLAND précompressé).

| Fichier | Rôle |
|---|---|
| `Dockerfile` | Image `mathisrvrs-site:local`, construite sur le serveur (`docker compose build`). |
| `Caddyfile` | Routes et en-têtes du site ; `REMOTE_ADDR` = IP réelle du visiteur. |
| `entrypoint.sh` | Écrit `/etc/msmtprc` (relais SMTP de `mail()`) depuis `.env`. |
| `docker-compose.yml` | Pile `site` ; `./www` monté en lecture seule. |
| `.env.example` | SMTP Scaleway TEM, à copier en `/opt/site/.env` (600). |

Déploiement : `.github/workflows/deploy.yml` envoie `dist/` dans `/opt/site/www` par rsync
(`--delay-updates` : les fichiers changent tous à la fin), sans redémarrer le conteneur.

## 1. Utilisateur de déploiement (à faire une fois)

Le CI n'utilise pas `deploy` (sudo, docker) : utilisateur `site`, clé limitée à rsync dans
`/opt/site/www` par `rrsync`.

```bash
ssh-keygen -t ed25519 -N '' -C mathisrvrs-deploy-ci -f ~/.ssh/mathisrvrs_deploy_ci
ssh deploy@185.226.172.52 'sudo useradd --create-home --shell /bin/sh site \
  && sudo chown -R site:site /opt/site/www \
  && sudo install -d -o site -g site -m 700 /home/site/.ssh'
echo "command=\"/usr/bin/rrsync /opt/site/www\",restrict $(cat ~/.ssh/mathisrvrs_deploy_ci.pub)" \
  | ssh deploy@185.226.172.52 'sudo tee /home/site/.ssh/authorized_keys >/dev/null \
  && sudo chown site:site /home/site/.ssh/authorized_keys && sudo chmod 600 /home/site/.ssh/authorized_keys'
gh secret set VPS_SSH_KEY < ~/.ssh/mathisrvrs_deploy_ci
# Contrôle : écriture possible dans www, rien d'autre (shell refusé). rrsync refuse le
# openrsync de macOS : utiliser rsync 3 (brew install rsync, ou un conteneur ubuntu).
rsync -n -rl dist/ -e 'ssh -i ~/.ssh/mathisrvrs_deploy_ci' site@185.226.172.52: && echo rsync-ok
ssh -i ~/.ssh/mathisrvrs_deploy_ci site@185.226.172.52 id   # doit être refusé par rrsync
```

## 2. E-mails du formulaire (Scaleway TEM)

1. Console Scaleway → Transactional Email → ajouter le domaine `mathis-rvrs.fr` (région fr-par).
2. DNS OVH de `mathis-rvrs.fr` : enregistrement DKIM (`<id>._domainkey`) donné par Scaleway,
   SPF **unique** complété : `v=spf1 include:mx.ovh.com include:_spf.tem.scaleway.com ~all`,
   DMARC (`_dmarc`) : `v=DMARC1; p=none`.
3. Application IAM dédiée (politique `TransactionalEmailFullAccess`, ce projet seulement).
4. `/opt/site/.env` : `SMTP_HOST=smtp.tem.scaleway.com`, `SMTP_USER=<ID du projet>`,
   `SMTP_PASSWORD=<clé secrète>`, puis `cd /opt/site && docker compose up -d`.
5. Essai : formulaire de contact visé par l'IP du VPS (`curl --resolve … -k`), journal :
   `docker compose logs web | grep msmtp`.

## 3. Bascule DNS

1. DNS OVH : `A mathis-rvrs.fr → 185.226.172.52`, `www` → idem (remplace `51.91.236.255`).
2. Une fois propagé (`dig +short mathis-rvrs.fr`) : retirer `tls internal` de
   `deploy/edge/sites/mathis-rvrs.caddy`, copier sur le serveur, `caddy reload` (sans coupure).
3. Workflow : supprimer les étapes OVH (FTP, wasm mis de côté) et le `--resolve … -k` du
   smoke test VPS.
