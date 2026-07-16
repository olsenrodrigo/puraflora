import { Router, type Request } from "express";
import { z } from "zod";
import { upsertAbandonedCheckout, getAbandonedByToken, deleteAbandonedByToken, getProductBySlug } from "../storage";
import type { ProductRow } from "../../shared/schema";

// Rate limit simples em memória por IP. Uma varredura periódica remove entradas
// expiradas para o Map não crescer indefinidamente com IPs que não retornam.
const HITS = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
setInterval(() => {
  const now = Date.now();
  for (const [ip, v] of HITS) if (now > v.resetAt) HITS.delete(ip);
}, 5 * 60_000).unref();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = HITS.get(ip);
  if (!cur || now > cur.resetAt) {
    HITS.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  cur.count += 1;
  return cur.count > MAX_PER_WINDOW;
}
function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function textName(p: ProductRow): string {
  const i18n = p.i18n as Record<string, { name?: string }> | null;
  return i18n?.pt?.name ?? p.slug;
}

const captureSchema = z.object({
  cartToken: z.string().uuid(), // capability opaca e imprevisível
  customerName: z.string().max(120).nullable().optional(),
  customerPhone: z.string().min(8).max(20),
  customerEmail: z.string().email().max(160).nullable().optional(),
  couponCode: z.string().max(40).nullable().optional(),
  consent: z.literal(true), // LGPD: sem consentimento explícito, não grava
  items: z
    .array(z.object({ productSlug: z.string().min(1).max(120), quantity: z.number().int().positive().max(99) }))
    .min(1)
    .max(50),
});

const RECOVERABLE = new Set(["open", "contacted"]);

export function cartsRouter(): Router {
  const router = Router();

  // Captura/atualiza um checkout abandonado (só com consentimento).
  router.post("/abandoned", async (req, res) => {
    if (rateLimited(clientIp(req))) {
      return res.status(429).json({ error: "Muitas requisições, tente em instantes" });
    }
    const parsed = captureSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos" });
    }
    const input = parsed.data;

    // Nome e preço vêm do CATÁLOGO (fonte de verdade) — nunca do cliente. Evita
    // injeção de texto/links na mensagem de recuperação e preços forjados.
    const items: { productSlug: string; productName: string; quantity: number; unitPrice: string }[] = [];
    for (const it of input.items) {
      const p = await getProductBySlug(it.productSlug);
      if (!p || !p.active) continue;
      items.push({
        productSlug: p.slug,
        productName: textName(p),
        quantity: it.quantity,
        unitPrice: Number(p.price).toFixed(2),
      });
    }
    if (items.length === 0) {
      return res.status(400).json({ error: "Nenhum item válido" });
    }
    const subtotal = items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);

    try {
      const row = await upsertAbandonedCheckout({
        cartToken: input.cartToken,
        customerName: input.customerName ?? null,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail ?? null,
        itemsSnapshot: items,
        subtotal: subtotal.toFixed(2),
        couponCode: input.couponCode ?? null,
        consentAt: new Date(),
      });
      return res.json({ ok: true, id: row?.id ?? null });
    } catch {
      return res.status(500).json({ error: "Erro ao registrar" });
    }
  });

  // Recupera itens do carrinho para restaurar (token = capability). NÃO devolve
  // dados pessoais e só serve carrinhos ainda recuperáveis (open/contacted).
  router.get("/abandoned/:cartToken", async (req, res) => {
    const tokenOk = z.string().uuid().safeParse(req.params.cartToken).success;
    if (!tokenOk) return res.status(404).json({ error: "Não encontrado" });
    const row = await getAbandonedByToken(req.params.cartToken);
    if (!row || !RECOVERABLE.has(row.status)) return res.status(404).json({ error: "Não encontrado" });
    return res.json({
      items: row.itemsSnapshot,
      couponCode: row.recoveryCouponCode || row.couponCode || null,
      status: row.status,
    });
  });

  // Revogação de consentimento (LGPD): o dono do token apaga os próprios dados.
  router.delete("/abandoned/:cartToken", async (req, res) => {
    if (rateLimited(clientIp(req))) {
      return res.status(429).json({ error: "Muitas requisições, tente em instantes" });
    }
    if (!z.string().uuid().safeParse(req.params.cartToken).success) {
      return res.status(400).json({ error: "Token inválido" });
    }
    await deleteAbandonedByToken(req.params.cartToken);
    return res.json({ ok: true });
  });

  return router;
}
