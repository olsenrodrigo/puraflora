#!/usr/bin/env bash
# Troca o token da SmartEnvios (e o CNPJ remetente) no .env local e no de produção (VPS).
#
# Uso: copie o token no portal SmartEnvios (Configurações → Integrações →
# SmartEnvios API → Configurar → ícone de copiar) e rode:
#   bash scripts/trocar-token-smartenvios.sh [CNPJ_REMETENTE]
# O token é lido da área de transferência (pbpaste) e nunca é impresso.
# Antes de tocar em produção, o token é validado com uma cotação real na API.
set -euo pipefail

CNPJ="${1:-69237753000111}"            # TM3 TECNOLOGIA E COMERCIO LTDA
VPS="root@76.13.229.194"
VPS_DIR="/var/www/puraflora"
SITE="https://puraflora.com.br"
API="https://api.smartenvios.com/v1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
QUOTE_BODY='{"zip_code_start":"14020210","zip_code_end":"01310100","total_price":120,"volumes":[{"weight":0.5,"height":10,"length":20,"width":15,"quantity":1,"price":120}]}'

TOKEN="$(pbpaste | tr -d '[:space:]')"
[ "${#TOKEN}" -ge 20 ] || { echo "ERRO: área de transferência não parece ter o token (${#TOKEN} caracteres)."; exit 1; }
echo "Token lido da área de transferência (${#TOKEN} caracteres, termina em …${TOKEN: -4})."

echo "1/4 Validando o token direto na API SmartEnvios…"
RESP="$(curl -s -m 30 -X POST "$API/quote/freight" -H "Content-Type: application/json" -H "token: $TOKEN" -d "$QUOTE_BODY")"
if ! printf '%s' "$RESP" | grep -q '"result":\['; then
  echo "ERRO: a SmartEnvios recusou a cotação com esse token. Nada foi alterado."
  printf '%s\n' "$RESP" | head -c 400; echo
  echo "Dica: no portal, clique em 'Conectar minha conta' no card SmartEnvios API e tente de novo."
  exit 1
fi
echo "   OK — $(printf '%s' "$RESP" | grep -o '"service":"[^"]*"' | head -3 | cut -d'"' -f4 | paste -sd, -)"

echo "2/4 Atualizando o .env local (backup: .env.bak-$STAMP)…"
cp "$ROOT/.env" "$ROOT/.env.bak-$STAMP"
TOKEN_RAW="$TOKEN" CNPJ="$CNPJ" perl -i -pe '
  s/^SMARTENVIOS_TOKEN=.*/SMARTENVIOS_TOKEN=$ENV{TOKEN_RAW}/;
  s/^SENDER_DOCUMENT=.*/SENDER_DOCUMENT=$ENV{CNPJ}/;
' "$ROOT/.env"

# No .env do Docker Compose (produção), '$' precisa ser escrito como '$$'.
TOKEN_ENV="${TOKEN//\$/\$\$}"

echo "3/4 Atualizando o .env de produção e recriando o container web…"
printf '%s' "$TOKEN_ENV" | ssh "$VPS" "set -e; cd $VPS_DIR
  T=\$(cat); mkdir -p backups; cp .env backups/.env.bak-$STAMP-smartenvios
  TOKEN_ENV=\"\$T\" CNPJ=$CNPJ perl -i -pe '
    s/^SMARTENVIOS_TOKEN=.*/SMARTENVIOS_TOKEN=\$ENV{TOKEN_ENV}/;
    s/^SENDER_DOCUMENT=.*/SENDER_DOCUMENT=\$ENV{CNPJ}/;
  ' .env
  grep -q '^SENDER_DOCUMENT=$CNPJ\$' .env
  docker compose up -d --force-recreate web >/dev/null 2>&1"

echo "4/4 Testando a cotação pelo site ($SITE)…"
for i in $(seq 1 20); do
  curl -sf -m 5 "$SITE/api/shipping/config" >/dev/null && break; sleep 3
done
SITE_RESP="$(curl -s -m 30 -X POST "$SITE/api/shipping/quote" -H 'Content-Type: application/json' \
  -d '{"zipTo":"01310100","subtotal":120,"volumes":[{"weight":0.5,"height":10,"length":20,"width":15,"quantity":1,"price":120}]}')"
if printf '%s' "$SITE_RESP" | grep -q '"mock":false' && printf '%s' "$SITE_RESP" | grep -q '"isValid":true'; then
  echo "   OK — site cotando pela conta nova: $(printf '%s' "$SITE_RESP" | grep -o '"service":"[^"]*","value":[0-9.]*' | head -3 | sed 's/"service":"//;s/","value":/ R$ /' | paste -sd, -)"
  echo "Pronto. Backups: $ROOT/.env.bak-$STAMP e $VPS_DIR/backups/.env.bak-$STAMP-smartenvios"
else
  echo "ERRO na cotação pelo site:"; printf '%s\n' "$SITE_RESP" | head -c 400; echo
  echo "Para voltar: ssh $VPS 'cd $VPS_DIR && cp backups/.env.bak-$STAMP-smartenvios .env && docker compose up -d --force-recreate web'"
  exit 1
fi
