import { Router } from "express";
import { listActiveProducts, listCategories, getStoreSettings } from "../storage";
import type { ProductRow, AnalyticsConfig } from "../../shared/schema";

// Formato compatível com a interface `Product` de src/data/catalog.ts,
// para o front-end continuar consumindo o mesmo shape de sempre.
function toApiProduct(p: ProductRow) {
  return {
    id: p.id,
    slug: p.slug,
    image: p.image,
    category: p.categoryId,
    price: Number(p.price),
    compareAt: p.compareAtPrice != null ? Number(p.compareAtPrice) : undefined,
    rating: Number(p.rating),
    reviews: p.reviews,
    featured: p.featured,
    badge: p.badge ?? undefined,
    hero: p.heroOrder != null ? { order: p.heroOrder, accent: p.heroAccent ?? "#cdb59b" } : undefined,
    i18n: p.i18n,
    weightG: p.weightG,
    lengthCm: Number(p.lengthCm),
    widthCm: Number(p.widthCm),
    heightCm: Number(p.heightCm),
  };
}

export function productsRouter(): Router {
  const router = Router();

  router.get("/products", async (_req, res) => {
    const rows = await listActiveProducts();
    res.json(rows.map(toApiProduct));
  });

  router.get("/categories", async (_req, res) => {
    const rows = await listCategories();
    res.json(
      rows
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => ({ id: c.id, name: c.name, blurb: c.blurb, icon: c.icon, accent: c.accent }))
    );
  });

  // Config pública da loja para o front (analytics/pixels). Só IDs públicos —
  // nunca tokens secretos. requireConsent default true (LGPD).
  router.get("/config", async (_req, res) => {
    const settings = await getStoreSettings();
    const ac = (settings?.analyticsConfig ?? {}) as AnalyticsConfig;
    res.set("Cache-Control", "public, max-age=300");
    res.json({
      analytics: {
        ga4MeasurementId: ac.ga4MeasurementId || null,
        metaPixelId: ac.metaPixelId || null,
        tiktokPixelId: ac.tiktokPixelId || null,
        requireConsent: ac.requireConsent !== false, // default true
      },
    });
  });

  return router;
}
