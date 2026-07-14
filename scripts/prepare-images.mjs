// Converte as fotos originais dos produtos (ARQUIVOS/Produtos/<pasta>/1.png)
// em WebP otimizado dentro de public/products/<slug>.webp.
// Idempotente: pula os arquivos que já existem.
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "../../ARQUIVOS/Produtos");
const OUT_DIR = path.resolve(__dirname, "../public/products");

// pasta de origem -> slug usado no catálogo
const MAP = {
  "6Mags": "6mags",
  Cramberry: "cranberry",
  "Cúrcuma Magnésio+MSM": "curcuma-magnesio-msm",
  "Dermemaxx 1000": "dermemax-1000",
  Dimalato: "dimalato",
  "Feno Grego": "feno-grego",
  KeratinMaxx: "keratin-maxx",
  MentaFort: "menta-fort",
  NatuProst: "natuprost",
  NatusMel: "natusmel",
  "NatusViton A-Z": "natus-viton-az",
  "NatusViton Imuno": "natus-viton-imuno",
  NutriNatus: "nutri-natus-amargo",
  "Omegas Femme": "omegas-femme",
  Q10: "coq10",
  TherManiac: "ther-maniac",
  "Top Reduxx": "top-reduxx",
  Triptofano: "triptofano",
  UcFlex: "uc-flex-ii",
};

const SIZE = 900;
const QUALITY = 82;

const LOGOS_DIR = path.resolve(__dirname, "../../logos");
const BRAND_DIR = path.resolve(OUT_DIR, "../brand");

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// Gera uma silhueta monocromática (mantém o alfa, preenche o RGB com a cor).
// Usado para exibir o logo em fundos escuros (versão creme).
async function monoTint(src, out, width, hex) {
  const { data, info } = await sharp(src)
    .resize({ width })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const [r, g, b] = hexToRgb(hex);
  const buf = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    buf[i * 4] = r;
    buf[i * 4 + 1] = g;
    buf[i * 4 + 2] = b;
    buf[i * 4 + 3] = data[i * 4 + 3];
  }
  await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
    .webp({ quality: 92 })
    .toFile(out);
}

async function prepareBrand() {
  if (!fs.existsSync(LOGOS_DIR)) {
    console.warn(`[brand] pasta de logos não encontrada: ${LOGOS_DIR}`);
    return;
  }
  fs.mkdirSync(BRAND_DIR, { recursive: true });

  const logo = path.join(LOGOS_DIR, "logo.png");
  const tagline = path.join(LOGOS_DIR, "logo_comtagline.png");
  const icon = path.join(LOGOS_DIR, "icone_logotipo.png");

  const tasks = [
    // logo colorido (fundos claros)
    () => sharp(logo).resize({ width: 880 }).webp({ quality: 92 }).toFile(path.join(BRAND_DIR, "logo.webp")),
    () => sharp(tagline).resize({ width: 900 }).webp({ quality: 92 }).toFile(path.join(BRAND_DIR, "logo-tagline.webp")),
    () => sharp(icon).resize({ width: 512 }).webp({ quality: 92 }).toFile(path.join(BRAND_DIR, "icon.webp")),
    // ícone em PNG (usado como máscara CSS para a animação de brilho)
    () => sharp(icon).resize({ width: 512 }).png().toFile(path.join(BRAND_DIR, "icon.png")),
    // versões creme (fundos escuros)
    () => monoTint(logo, path.join(BRAND_DIR, "logo-cream.webp"), 880, "#FFFCF7"),
    () => monoTint(icon, path.join(BRAND_DIR, "icon-cream.webp"), 512, "#FFFCF7"),
    // favicon
    () => sharp(icon).resize({ width: 96 }).png().toFile(path.join(BRAND_DIR, "favicon.png")),
  ];

  for (const t of tasks) await t();
  console.log(`[brand] logos gerados em public/brand/`);
}

async function run() {
  await prepareBrand();

  if (!fs.existsSync(SRC_DIR)) {
    console.warn(`[images] pasta de origem não encontrada: ${SRC_DIR} — pulando.`);
    return;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let created = 0;
  let skipped = 0;
  let missing = 0;

  for (const [folder, slug] of Object.entries(MAP)) {
    const src = path.join(SRC_DIR, folder, "1.png");
    const out = path.join(OUT_DIR, `${slug}.webp`);

    if (!fs.existsSync(src)) {
      console.warn(`[images] origem ausente para "${slug}": ${src}`);
      missing++;
      continue;
    }
    if (fs.existsSync(out)) {
      skipped++;
      continue;
    }

    await sharp(src)
      .resize(SIZE, SIZE, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .flatten({ background: "#ffffff" })
      .webp({ quality: QUALITY })
      .toFile(out);

    created++;
    console.log(`[images] ✓ ${slug}.webp`);
  }

  console.log(
    `[images] concluído — ${created} criadas, ${skipped} já existentes, ${missing} ausentes.`
  );
}

run().catch((err) => {
  console.error("[images] falha:", err);
  process.exit(0); // não bloqueia o dev/build
});
