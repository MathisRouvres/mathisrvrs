#!/bin/sh
# Écrit la configuration de msmtp (relais SMTP de mail()) depuis l'environnement, puis lance
# FrankenPHP. Sans SMTP_HOST, aucun relais : mail() échoue et contact.php répond une erreur.
set -eu

if [ -n "${SMTP_HOST:-}" ]; then
  umask 077
  cat > /etc/msmtprc <<EOF
defaults
auth on
tls on
tls_starttls off
tls_trust_file /etc/ssl/certs/ca-certificates.crt
logfile /proc/1/fd/2

account default
host ${SMTP_HOST}
port ${SMTP_PORT:-465}
user ${SMTP_USER:?SMTP_USER manquant}
password ${SMTP_PASSWORD:?SMTP_PASSWORD manquant}
from ${SMTP_FROM:-contact@mathis-rvrs.fr}
EOF
else
  echo "SMTP_HOST absent : formulaire de contact sans envoi de mail." >&2
fi

exec "$@"
