# Service de connexion (auth.mathis-rvrs.fr) : Node sans dépendance, utilisateur non root.
FROM node:22-alpine
# qrencode : QR code du secret TOTP affiché par setup.mjs dans le terminal.
RUN apk add --no-cache libqrencode-tools
WORKDIR /app
COPY lib.mjs server.mjs setup.mjs ./
RUN install -d -o node -g node -m 700 /config
USER node
ENV NODE_ENV=production
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:8080/health || exit 1
CMD ["node", "server.mjs"]
