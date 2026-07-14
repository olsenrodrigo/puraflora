# ─── Build ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# instala dependências (cache eficiente)
COPY package*.json ./
RUN npm ci

# copia o código e gera o build de produção
COPY . .
# As imagens WebP dos produtos/marca já estão versionadas em public/;
# o passo prebuild apenas as regenera se as artes-fonte existirem (não é o caso no build).
RUN npm run build

# ─── Serve (nginx) ───────────────────────────────────────────────────────────
FROM nginx:alpine AS serve
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
