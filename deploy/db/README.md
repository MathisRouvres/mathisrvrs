# MySQL + phpMyAdmin (`/opt/db`)

MySQL 8.4 (256 Mo de cache InnoDB, aucun port publié) sur le réseau Docker `db`, alias `mysql`.
phpMyAdmin sur `pma.mathis-rvrs.fr`, derrière la connexion de l'espace privé (`deploy/auth`),
puis sa propre connexion MySQL (root ou l'utilisateur d'une app).

| Base | Utilisateur | `.env` de l'app |
|---|---|---|
| `travaux` | `travaux` | `/opt/travaux/.env` |
| `arbitre` | `arbitre` | `/opt/arbitre/.env` |
| `job` | `job` | `/opt/job/.env` |

Chaque utilisateur n'a de droits que sur sa base. `create-app-db.sh <app> <.env>` crée la base et
l'utilisateur (ou change son mot de passe) et écrit `DATABASE_URL` dans le `.env` de l'app.
Mot de passe root : `/opt/db/.env` (600), généré sur le serveur.

## Sauvegardes

`backup.sh` : `mysqldump` de toutes les bases (`--single-transaction`), compressé, 14 jours dans
`/opt/db/backups` (700). Planification à poser une fois (crontab de `deploy`) :

```bash
(crontab -l 2>/dev/null; echo '50 3 * * * bash /opt/db/backup.sh >> /opt/db/backups/backup.log 2>&1') | crontab -
```

Restauration d'une base :

```bash
zcat backups/mysql-AAAAMMJJ-HHMM.sql.gz | docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot'
```
