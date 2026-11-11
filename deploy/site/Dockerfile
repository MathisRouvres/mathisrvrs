# Site mathis-rvrs.fr : fichiers statiques du build Vite + contact.php, dans FrankenPHP (Caddy
# avec PHP intégré). Les fichiers ne sont pas dans l'image : /srv/www est monté en lecture seule
# et rempli par le déploiement (rsync depuis GitHub Actions).
FROM dunglas/frankenphp:1.13-php8.4-alpine

# mail() de contact.php : msmtp joue le rôle de sendmail et relaie vers le SMTP configuré.
# pdo_mysql : dispo-api.php (calendrier /dispo) et la base MySQL du VPS (deploy/db).
RUN apk add --no-cache msmtp \
    && install-php-extensions pdo_mysql \
    && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && printf 'sendmail_path = "/usr/bin/msmtp -t -i"\nexpose_php = Off\n' \
       > "$PHP_INI_DIR/conf.d/zz-site.ini"

COPY Caddyfile /etc/caddy/Caddyfile
COPY entrypoint.sh /usr/local/bin/site-entrypoint

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1/robots.txt || exit 1

ENTRYPOINT ["site-entrypoint"]
CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile"]
