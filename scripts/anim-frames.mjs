// Gera quadros-fonte (logo/ícone sobre fundos da marca) para animação no Higgsfield.
// Fundos claros usam o logo colorido; fundos escuros usam a silhueta creme.
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGOS = path.resolve(__dirname, "../../logos");
const OUT = path.resolve(__dirname, "../public/brand/anim");
fs.mkdirSync(OUT, { recursive: true });

const CREAM = "#FFFCF7";
const FOREST = "#3F5242";
const icon = path.join(LOGOS, "icone_logotipo.png");
const logo = path.join(LOGOS, "logo.png");

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// Silhueta colorida (mantém alfa) — para exibir logos sobre fundos escuros.
async function tintBuffer(src, width, hex) {
  const { data, info } = await sharp(src).resize({ width }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const [r, g, b] = hexToRgb(hex);
  const buf = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    buf[i * 4] = r; buf[i * 4 + 1] = g; buf[i * 4 + 2] = b; buf[i * 4 + 3] = data[i * 4 + 3];
  }
  return sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

async function frame({ src, tint, out, w, h, bg, scale }) {
  const rw = Math.round(w * scale);
  const overlay = tint
    ? await tintBuffer(src, rw, tint)
    : await sharp(src).resize({ width: rw, fit: "inside" }).toBuffer();
  await sharp({ create: { width: w, height: h, channels: 3, background: bg } })
    .composite([{ input: overlay, gravity: "center" }])
    .png()
    .toFile(out);
  console.log("✓", path.basename(out));
}

// Ícone (broto) — foco da animação "folhas brilhando / crescendo"
await frame({ src: icon, out: path.join(OUT, "icon-cream-1x1.png"), w: 1024, h: 1024, bg: CREAM, scale: 0.66 });
await frame({ src: icon, tint: CREAM, out: path.join(OUT, "icon-forest-1x1.png"), w: 1024, h: 1024, bg: FOREST, scale: 0.66 });
await frame({ src: icon, out: path.join(OUT, "icon-cream-16x9.png"), w: 1920, h: 1080, bg: CREAM, scale: 0.34 });
await frame({ src: icon, tint: CREAM, out: path.join(OUT, "icon-forest-16x9.png"), w: 1920, h: 1080, bg: FOREST, scale: 0.34 });
// Wordmark completo — animação "revelação da marca"
await frame({ src: logo, out: path.join(OUT, "logo-cream-16x9.png"), w: 1920, h: 1080, bg: CREAM, scale: 0.66 });
await frame({ src: logo, tint: CREAM, out: path.join(OUT, "logo-forest-16x9.png"), w: 1920, h: 1080, bg: FOREST, scale: 0.66 });

console.log("frames em public/brand/anim/");
