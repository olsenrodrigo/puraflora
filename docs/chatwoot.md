# Chat funcional no site (Chatwoot)

O PuraFlora tem um **botão de WhatsApp** por padrão. Para uma **caixa de chat de
verdade** no site (conversa em tempo real, painel de resposta, histórico) usamos o
**Chatwoot** — open-source, self-hosted na própria VPS, sem custo por mensagem.

Enquanto o Chatwoot não está configurado, o site mostra o botão do WhatsApp.
Quando as variáveis de build (`VITE_CHATWOOT_BASE_URL` + `VITE_CHATWOOT_TOKEN`)
estão definidas, o chat do Chatwoot assume — **e só carrega após o consentimento
de cookies** (LGPD), com o botão do WhatsApp servindo de fallback antes disso.

> A integração no front já está pronta (`ChatwootWidget` + `SupportWidget`).
> Este documento é só o passo a passo de infraestrutura na VPS.

---

## 1. Pré-requisitos

- Docker + Docker Compose na VPS (já usados no projeto).
- Um **subdomínio** apontando para a VPS, ex.: `chat.puraflora.com.br` (registro A).
- ~2 GB de RAM livres (Chatwoot + Postgres + Redis).

## 2. Estrutura

Crie uma pasta separada na VPS (ex.: `/var/www/chatwoot`) com um `.env` e um
`docker-compose.yaml`. **Não misture com o banco do PuraFlora** — o Chatwoot usa
Postgres/Redis próprios.

### `.env` do Chatwoot

```env
INSTALLATION_ENV=docker
NODE_ENV=production
RAILS_ENV=production
# Gere com: openssl rand -hex 64
SECRET_KEY_BASE=COLE_UMA_STRING_ALEATORIA_LONGA
# URL pública (com https) — precisa bater com o subdomínio + proxy/SSL
FRONTEND_URL=https://chat.puraflora.com.br
DEFAULT_LOCALE=pt_BR
# Postgres
POSTGRES_HOST=postgres
POSTGRES_DATABASE=chatwoot
POSTGRES_USERNAME=chatwoot
POSTGRES_PASSWORD=TROQUE_ESTA_SENHA
# Redis
REDIS_URL=redis://redis:6379
RAILS_MAX_THREADS=5
```

### `docker-compose.yaml` (baseado no oficial)

> Confira sempre a versão estável atual e o compose de referência em
> https://www.chatwoot.com/docs/self-hosted/deployment/docker — o Chatwoot evolui.
> Troque `latest` por uma tag fixa (ex.: `v3.x.y`) para builds reprodutíveis.

```yaml
services:
  base: &base
    image: chatwoot/chatwoot:latest
    env_file: .env
    volumes:
      - data:/app/storage
    restart: unless-stopped

  rails:
    <<: *base
    depends_on: [postgres, redis]
    ports:
      # bind só no loopback; o nginx faz o proxy + SSL na frente
      - "127.0.0.1:3000:3000"
    entrypoint: docker/entrypoints/rails.sh
    command: ["bundle", "exec", "rails", "s", "-p", "3000", "-b", "0.0.0.0"]

  sidekiq:
    <<: *base
    depends_on: [postgres, redis]
    command: ["bundle", "exec", "sidekiq", "-C", "config/sidekiq.yml"]

  postgres:
    image: pgvector/pgvector:pg16
    restart: unless-stopped
    environment:
      POSTGRES_DB: chatwoot
      POSTGRES_USER: chatwoot
      POSTGRES_PASSWORD: TROQUE_ESTA_SENHA
    volumes:
      - pg:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis:/data

volumes:
  data:
  pg:
  redis:
```

## 3. Subir

```bash
cd /var/www/chatwoot
# prepara o banco (cria schema + seed) — só na primeira vez
docker compose run --rm rails bundle exec rails db:chatwoot_prepare
# sobe tudo
docker compose up -d
```

## 4. Proxy reverso + SSL (nginx na VPS)

Aponte `chat.puraflora.com.br` para `127.0.0.1:3000` e gere o certificado
(Certbot). Exemplo de server block:

```nginx
server {
  server_name chat.puraflora.com.br;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;        # websocket do chat
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
# depois: sudo certbot --nginx -d chat.puraflora.com.br
```

## 5. Criar a caixa de entrada "Website" e pegar o token

1. Acesse `https://chat.puraflora.com.br` → crie a conta de administrador.
2. **Caixas de entrada → Adicionar → Website**.
3. Preencha nome (ex.: "PuraFlora") e o domínio do site (`puraflora.com.br`).
4. Ao final, o Chatwoot mostra um trecho de código. Você só precisa de dois
   valores dali:
   - **`websiteToken`** (string longa) → vai em `VITE_CHATWOOT_TOKEN`.
   - **`baseUrl`** = `https://chat.puraflora.com.br` → vai em `VITE_CHATWOOT_BASE_URL`.

## 6. Ligar no PuraFlora

No `.env` do PuraFlora (na VPS, onde o build roda), preencha:

```env
VITE_CHATWOOT_BASE_URL=https://chat.puraflora.com.br
VITE_CHATWOOT_TOKEN=SEU_WEBSITE_TOKEN
```

Como são variáveis do **Vite (build-time)**, é preciso **rebuildar o front**:

```bash
npm run build
# e reiniciar/servir como de costume (deploy normal do PuraFlora)
```

Pronto: a caixa de chat do Chatwoot aparece no site (após o consentimento de
cookies). Você responde pelo painel do Chatwoot (web + app iOS/Android).

## 7. (Opcional) Conectar o WhatsApp ao mesmo inbox

No Chatwoot: **Caixas de entrada → Adicionar → WhatsApp**. Ele usa a **API oficial
da Meta** (Cloud API) — exige número dedicado + verificação Meta + custo por
conversa (as mesmas ressalvas de qualquer integração oficial do WhatsApp). Assim,
mensagens do site e do WhatsApp caem no mesmo painel. Isso é um passo à parte e
independente do chat do site funcionar.

---

## Notas

- **LGPD:** o script do Chatwoot só é injetado após o consentimento de cookies —
  antes disso o site mostra o botão do WhatsApp. Se preferir tratar o chat como
  ferramenta essencial (carregar sempre), é um ajuste de uma linha no
  `SupportWidget`.
- **Backups:** faça dump periódico do Postgres do Chatwoot (histórico de conversas).
- **Recursos:** para uma loja pequena, os defaults bastam; monitore RAM.
