# Imagen de producción: backend + frontend en un solo contenedor
FROM node:22-alpine
WORKDIR /srv
ENV NODE_ENV=production PORT=8080
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev
COPY app ./app
COPY backend ./backend
COPY index.html ./index.html
USER node
EXPOSE 8080
CMD ["node", "backend/server.js"]
