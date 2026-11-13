# Dashboard privé (dashboard.mathis-rvrs.fr) : Node sans dépendance.
# bash + curl + docker-cli : scan.sh lance les outils comme conteneurs frères via le socket Docker.
# Tourne en root car l'accès au socket Docker (monté par compose) l'exige ; accès déjà équivalent
# root sur l'hôte, le service reste derrière le login de l'espace privé.
FROM node:22-alpine
RUN apk add --no-cache bash curl docker-cli
WORKDIR /app
COPY server.mjs scan.sh ./
RUN chmod +x scan.sh
ENV NODE_ENV=production
EXPOSE 8300
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:8300/health || exit 1
CMD ["node", "server.mjs"]
