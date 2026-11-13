# Dashboard privé (dashboard.mathis-rvrs.fr) : Node sans dépendance, utilisateur non root.
FROM node:22-alpine
WORKDIR /app
COPY server.mjs ./
USER node
ENV NODE_ENV=production
EXPOSE 8300
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:8300/health || exit 1
CMD ["node", "server.mjs"]
