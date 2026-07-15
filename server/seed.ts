import "./env";
import { STATIC_PRODUCTS, STATIC_CATEGORIES, PACKAGES } from "../src/data/catalog";
import { upsertCategory, upsertProductBySlug, countAdmins, createAdminUser } from "./storage";
import { hashPassword } from "./auth";

async function seedCategories() {
  let n = 0;
  for (const [index, cat] of STATIC_CATEGORIES.entries()) {
    await upsertCategory({
      id: cat.id,
      name: cat.name,
      blurb: cat.blurb,
      icon: cat.icon,
      accent: cat.accent,
      sortOrder: index,
      active: true,
    });
    n++;
  }
  console.log(`[seed] ${n} categorias migradas`);
}

async function seedProducts() {
  let n = 0;
  for (const p of STATIC_PRODUCTS) {
    const dims = PACKAGES[p.slug] ?? { weightG: 300, lengthCm: 11, widthCm: 6, heightCm: 6 };
    await upsertProductBySlug({
      slug: p.slug,
      image: p.image,
      categoryId: p.category,
      price: String(p.price),
      compareAtPrice: p.compareAt != null ? String(p.compareAt) : null,
      rating: String(p.rating),
      reviews: p.reviews,
      featured: !!p.featured,
      badge: p.badge ?? null,
      heroOrder: p.hero?.order ?? null,
      heroAccent: p.hero?.accent ?? null,
      weightG: dims.weightG,
      lengthCm: String(dims.lengthCm),
      widthCm: String(dims.widthCm),
      heightCm: String(dims.heightCm),
      i18n: p.i18n,
      active: true,
    });
    n++;
  }
  console.log(`[seed] ${n} produtos migrados`);
}

async function seedAdmin() {
  const count = await countAdmins();
  if (count > 0) {
    console.log("[seed] admin já existe, pulando");
    return;
  }
  const email = process.env.ADMIN_EMAIL || "admin@puraflora.com.br";
  const password = process.env.ADMIN_PASSWORD || "PuraFlora@2026";
  await createAdminUser({ name: "Administrador", email, passwordHash: hashPassword(password) });
  console.log(`[seed] admin padrão criado: ${email}`);
}

async function main() {
  await seedCategories();
  await seedProducts();
  await seedAdmin();
  console.log("[seed] concluído");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] erro:", err);
  process.exit(1);
});
