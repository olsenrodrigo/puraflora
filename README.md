# PuraFlora — E-commerce de Suplementos Naturais

Plataforma de e-commerce da **PuraFlora**, marca de suplementos naturais, naturopatia e cuidado integrativo. Baseada na arquitetura do `whitelabellojavirtual` (React + Vite + i18n + Tailwind + embla-carousel), com uma **Home totalmente redesenhada** e a **loja virtual embutida na home** + rota dedicada.

## ✨ Destaques

- **Home premium** com:
  - **Hero em carrossel** (autoplay) apresentando 5 produtos em destaque;
  - Faixa de selos, seções de copy (benefícios, filosofia/manifesto, categorias, como funciona, depoimentos, newsletter);
  - **Loja virtual embutida** ("Nossos queridinhos") direto na home.
- **Rota dedicada da loja** (`/loja`) com filtro por categoria, busca e ordenação.
- **Página de produto**, **carrinho** (drawer lateral + página) e **checkout** (finalização via WhatsApp — sem gateway de pagamento).
- **Multi-idioma** com **i18next**: 🇧🇷 Português (padrão) e 🇬🇧 Inglês — inclusive o conteúdo dos produtos.
- **19 produtos reais** (a partir de `ARQUIVOS/Produtos`), com imagens otimizadas em WebP.
- **Marca genérica PuraFlora** (logo em SVG — flor/lótus, verde botânico + dourado), pronta para ser substituída pela identidade final.

## 🚀 Como rodar

```bash
cd codigo
npm install
npm run dev
```

Acesse **http://localhost:5180**.

> O comando `predev` gera automaticamente as imagens WebP dos produtos
> (a partir de `../ARQUIVOS/Produtos`) em `public/products/` usando `sharp`.
> Para regenerá-las manualmente: `npm run images`.

### Outros comandos

| Comando           | Descrição                                        |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Sobe o servidor de desenvolvimento (Vite)        |
| `npm run build`   | Type-check + build de produção (`dist/`)         |
| `npm run preview` | Serve o build de produção localmente             |
| `npm run images`  | (Re)gera as imagens WebP dos produtos            |
| `npm run check`   | Type-check (TypeScript)                          |

## 🚀 Deploy na VPS

O app é um SPA estático (Vite). Três formas de publicar:

### Opção A — Docker Compose (recomendado)

```bash
git clone https://github.com/olsenrodrigo/puraflora.git
cd puraflora
docker compose up -d --build
```

Sobe o site na porta **8080** (via nginx com fallback de SPA e cache). Aponte seu
proxy/reverso (nginx/Caddy/Traefik) do domínio para `http://127.0.0.1:8080`.

### Opção B — Build estático + servidor

```bash
npm ci
npm run build          # gera dist/
npx serve -s dist -l 3000   # -s = fallback de SPA para index.html
```

Sirva o conteúdo de `dist/` com qualquer host estático (nginx, Caddy, Vercel, Netlify…).

### Opção C — nginx manual

`npm run build` e copie `dist/` para `/var/www/puraflora`. Use o `nginx.conf` deste
repositório como base — o essencial é o fallback de SPA:

```nginx
location / { try_files $uri $uri/ /index.html; }
```

> ℹ️ As imagens de produtos/marca (`public/products`, `public/brand`) já vêm
> versionadas, então o build funciona sem as artes-fonte. O passo `prebuild`
> (`prepare-images.mjs`) só regenera imagens quando as pastas `../ARQUIVOS` e
> `../logos` existem — caso contrário é ignorado com segurança.

## 🧱 Stack

- **React 19** + **TypeScript** + **Vite 7**
- **Tailwind CSS v4** (design system em `src/index.css`)
- **wouter** (rotas) · **i18next / react-i18next** (i18n)
- **embla-carousel** (hero) · **framer-motion** (animações) · **lucide-react** (ícones)
- Carrinho via **Context + localStorage** (sem back-end / banco de dados)

## 📁 Estrutura

```
codigo/
├── public/
│   ├── favicon.svg
│   └── products/            # imagens WebP geradas (build step)
├── scripts/
│   └── prepare-images.mjs   # PNG originais → WebP otimizado
└── src/
    ├── data/catalog.ts      # 19 produtos + 6 categorias (pt/en)
    ├── locales/{pt,en}.json # textos de interface
    ├── i18n.ts
    ├── context/CartContext.tsx
    ├── components/
    │   ├── brand/Logo.tsx    # marca PuraFlora (SVG)
    │   ├── home/             # Hero, Categorias, Filosofia, LojaEmbutida...
    │   ├── store/ProductCard.tsx
    │   ├── Navbar.tsx · Footer.tsx · CartDrawer.tsx · LanguageSwitcher.tsx
    │   └── ui/
    └── pages/
        ├── Home.tsx
        ├── Store.tsx · ProductDetail.tsx
        └── Cart.tsx · Checkout.tsx · NotFound.tsx
```

## 🗺️ Rotas

| Rota                     | Página                          |
| ------------------------ | ------------------------------- |
| `/`                      | Home (hero + copys + loja)      |
| `/loja`                  | Loja completa                   |
| `/loja?cat=<categoria>`  | Loja filtrada por categoria     |
| `/loja/produto/:slug`    | Detalhe do produto              |
| `/loja/carrinho`         | Carrinho                        |
| `/loja/checkout`         | Finalização (via WhatsApp)      |

## 🎨 Identidade visual

- **Logo oficial** PuraFlora (broto de folhas). As artes-fonte ficam em `../logos/`
  (`logo.png`, `logo_comtagline.png`, `icone_logotipo.png`) e o `prepare-images.mjs`
  gera as versões web em `public/brand/` (colorida, creme para fundos escuros e favicon).
- **Paleta oficial** aplicada via tokens em `src/index.css`:
  creme `#FFFCF7` · superfície `#F5F4EE` · verde floresta `#3F5242` · sage `#95A48E`
  · tan `#CDB59B` · texto `#29352B` / `#5C6C5D` · borda `#E4E4DE`.
- **Animação de brilho** no ícone (`GlowLogo`) — luz percorrendo as folhas + glow
  pulsante (destaque no painel da Filosofia).

## 🔧 Ajustes recomendados antes de produção

- **WhatsApp / contato**: `WHATSAPP_NUMBER` em `src/data/catalog.ts` e os dados do `Footer.tsx`.
- **Preços**: os valores em `src/data/catalog.ts` são exemplos e devem ser revisados.
- **Pagamento real**: integrar um gateway (o whitelabel original já traz Mercado Pago) caso não queira usar apenas o fluxo por WhatsApp.

---

> ⚠️ Os produtos são suplementos alimentares e não medicamentos. As descrições foram
> elaboradas a partir do material fornecido em `ARQUIVOS/Produtos`.
