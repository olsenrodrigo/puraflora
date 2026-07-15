# ─── Build ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# instala dependências (cache eficiente)
COPY package*.json ./
RUN npm ci

# copia o código e gera o build de produção (front-end + servidor)
COPY . .
# As imagens WebP dos produtos/marca já estão versionadas em public/;
# o passo prebuild apenas as regenera se as artes-fonte existirem (não é o caso no build).
RUN npm run build

# ─── Runtime (Node único: API + front-end estático) ─────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
RUN mkdir -p uploads/products

EXPOSE 3000
CMD ["node", "dist-server/index.js"]
