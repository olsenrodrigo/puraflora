import { Router, type Request } from "express";
import { z } from "zod";
import {
  listActiveProducts, listCategories, getStoreSettings, getProductBySlug,
  createReview, createReviewApproved, listApprovedReviews, getReviewAggregate, verifyPurchase,
  listActiveBundles, listBundlesForProduct, getRelatedProducts,
} from "../storage";
import type { ProductRow, AnalyticsConfig } from "../../shared/schema";

// Rate limit simples por IP para o POST de reviews (anti-spam).
const REVIEW_HITS = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of REVIEW_HITS) if (now > v.resetAt) REVIEW_HITS.delete(k);
}, 5 * 60_000).unref();
function reviewRateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = REVIEW_HITS.get(ip);
  if (!cur || now > cur.resetAt) { REVIEW_HITS.set(ip, { count: 1, resetAt: now + 60_000 }); return false; }
  cur.count += 1;
  return cur.count > 5;
}
function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  authorName: z.string().min(1).max(80),
  title: z.string().max(120).nullable().optional(),
  comment: z.string().max(2000).nullable().optional(),
  authorEmail: z.string().email().max(160).nullable().optional(),
  orderNumber: z.string().max(40).nullable().optional(),
  locale: z.enum(["pt", "en"]).optional(),
  website: z.string().max(200).optional(), // honeypot: se vier preenchido, descarta após o parse
});

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
      reviewsEnabled: settings?.reviewsEnabled !== false,
    });
  });

  // Kits ativos (para uma vitrine de "compre junto")
  router.get("/bundles", async (_req, res) => {
    res.set("Cache-Control", "public, max-age=120");
    res.json(await listActiveBundles());
  });

  // Relacionados + kits de um produto (para a PDP)
  router.get("/products/:slug/related", async (req, res) => {
    const product = await getProductBySlug(req.params.slug);
    if (!product) return res.status(404).json({ error: "Produto não encontrado" });
    const [related, bundles] = await Promise.all([
      getRelatedProducts(product.id),
      listBundlesForProduct(product.id),
    ]);
    res.json({ related: related.map(toApiProduct), bundles });
  });

  // Reviews aprovadas + agregado de um produto (público, paginado)
  router.get("/products/:slug/reviews", async (req, res) => {
    const product = await getProductBySlug(req.params.slug);
    if (!product) return res.status(404).json({ error: "Produto não encontrado" });
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 10;
    const [reviews, aggregate, settings] = await Promise.all([
      listApprovedReviews(product.id, limit, (page - 1) * limit),
      getReviewAggregate(product.id),
      getStoreSettings(),
    ]);
    res.json({ aggregate, reviews, page, reviewsEnabled: settings?.reviewsEnabled !== false });
  });

  // Envio de review (entra como pending por padrão; verifiedPurchase se bater)
  router.post("/products/:slug/reviews", async (req, res) => {
    const settings = await getStoreSettings();
    if (settings?.reviewsEnabled === false) {
      return res.status(403).json({ error: "Avaliações desativadas" });
    }
    const product = await getProductBySlug(req.params.slug);
    if (!product || !product.active) return res.status(404).json({ error: "Produto não encontrado" });

    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Dados inválidos" });
    const input = parsed.data;
    if (input.website) return res.json({ ok: true }); // honeypot: descarta silenciosamente

    // Rate-limit só de submissões VÁLIDAS (inválidas/honeypot não gastam a cota
    // de quem compartilha o IP).
    if (reviewRateLimited(clientIp(req))) {
      return res.status(429).json({ error: "Muitas avaliações, tente mais tarde" });
    }

    let verified = false;
    if (input.orderNumber && input.authorEmail) {
      verified = await verifyPurchase(input.orderNumber, input.authorEmail, product.slug);
    }
    const requireModeration = settings?.reviewsRequireModeration !== false;
    const status = requireModeration ? "pending" : "approved";
    const payload = {
      productId: product.id,
      rating: input.rating,
      authorName: input.authorName,
      authorEmail: input.authorEmail ?? null,
      title: input.title ?? null,
      comment: input.comment ?? null,
      verifiedPurchase: verified,
      locale: input.locale ?? "pt",
    };

    // Auto-aprovação (moderação off) grava + recalcula na MESMA transação.
    if (status === "approved") await createReviewApproved({ ...payload, status: "approved" });
    else await createReview({ ...payload, status: "pending" });

    res.json({ ok: true, status, verifiedPurchase: verified });
  });

  return router;
}
