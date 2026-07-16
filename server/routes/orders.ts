import { Router } from "express";
import { z } from "zod";
import { createOrderWithItems, getProductBySlug, validateCoupon, CouponExhaustedError, markAbandonedConverted, getBundleBySlug } from "../storage";
import type { ProductRow } from "../../shared/schema";
import { normalizeCouponCode } from "../../shared/coupon-utils";
import { priceBundle, type BundleDiscountType } from "../../shared/bundle-pricing";

// O cliente informa apenas slug + quantidade (+ frete escolhido). Preços,
// subtotal e total são SEMPRE recalculados no servidor a partir do catálogo —
// nunca confiar em valores vindos do navegador (evita pagar R$ 0,01 num pedido caro).
const orderItemSchema = z.object({
  productSlug: z.string().min(1),
  quantity: z.number().int().positive().max(99),
});

const orderSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().nullable().optional(),
  customerPhone: z.string().min(1),
  shippingCep: z.string().min(1),
  shippingAddress: z.string().min(1),
  shippingNumber: z.string().min(1),
  shippingComplement: z.string().nullable().optional(),
  shippingDistrict: z.string().min(1),
  shippingCity: z.string().min(1),
  shippingState: z.string().min(1),
  notes: z.string().nullable().optional(),
  shippingService: z.string().nullable().optional(),
  shippingAmount: z.union([z.string(), z.number()]).optional(),
  couponCode: z.string().max(64).nullable().optional(), // só o código; o desconto é recalculado no servidor
  // token do carrinho abandonado (opcional). Inválido/corrompido vira undefined
  // — nunca bloqueia o pedido inteiro.
  cartToken: z.string().uuid().optional().catch(undefined),
  // chaves extras (preços enviados pelo front) são ignoradas — recalculamos tudo
  items: z.array(orderItemSchema).default([]),
  // kits ("compre junto"): o servidor expande e re-preça a partir do catálogo
  bundles: z.array(z.object({ slug: z.string().min(1), quantity: z.number().int().positive().max(20) })).optional(),
}).refine((d) => d.items.length + (d.bundles?.length ?? 0) > 0, { message: "Pedido vazio" });

function generateOrderNumber(): string {
  return `PF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function textName(p: ProductRow): string {
  const i18n = p.i18n as Record<string, { name?: string }> | null;
  return i18n?.pt?.name ?? p.slug;
}

function sanitizeShipping(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

export function ordersRouter(): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    }
    const { items, bundles, shippingAmount, shippingService, couponCode, cartToken, ...customer } = parsed.data;

    try {
      // Recalcula preços a partir do catálogo (fonte de verdade)
      const resolved: Array<{
        productSlug: string; productName: string; quantity: number;
        unitPrice: string; totalPrice: string; bundleId?: number; bundleLabel?: string;
      }> = [];
      for (const raw of items) {
        const slug = (raw as { productSlug: string }).productSlug;
        const quantity = (raw as { quantity: number }).quantity;
        const product = await getProductBySlug(slug);
        if (!product || !product.active) {
          return res.status(400).json({ error: `Produto indisponível: ${slug}` });
        }
        const unitPrice = Number(product.price);
        const totalPrice = Math.round(unitPrice * quantity * 100) / 100;
        resolved.push({
          productSlug: product.slug,
          productName: textName(product),
          quantity,
          unitPrice: unitPrice.toFixed(2),
          totalPrice: totalPrice.toFixed(2),
        });
      }

      // Kits: o servidor expande em itens individuais, re-preça pelo catálogo e
      // distribui o desconto pro-rata (fonte única: shared/bundle-pricing).
      for (const b of bundles ?? []) {
        const bundle = await getBundleBySlug(b.slug);
        if (!bundle || !bundle.active) {
          return res.status(422).json({ error: `Kit indisponível: ${b.slug}` });
        }
        if (bundle.components.length === 0 || bundle.components.some((c) => !c.active)) {
          return res.status(422).json({ error: `Kit indisponível: ${b.slug}` });
        }
        const label = (bundle.i18n as Record<string, { name?: string }>)?.pt?.name ?? bundle.slug;
        const pricing = priceBundle(
          bundle.discountType as BundleDiscountType,
          Number(bundle.discountValue),
          bundle.components.map((c) => ({ productSlug: c.productSlug, unitPrice: c.unitPrice, quantity: c.quantity }))
        );
        for (let i = 0; i < pricing.components.length; i++) {
          const comp = pricing.components[i];
          resolved.push({
            productSlug: comp.productSlug,
            productName: bundle.components[i].productName,
            quantity: comp.quantity * b.quantity,
            unitPrice: comp.unitPrice.toFixed(2),
            totalPrice: (Math.round(comp.lineTotal * b.quantity * 100) / 100).toFixed(2),
            bundleId: bundle.id,
            bundleLabel: label,
          });
        }
      }

      const subtotal = Math.round(resolved.reduce((s, it) => s + Number(it.totalPrice), 0) * 100) / 100;
      const shipping = sanitizeShipping(shippingAmount);

      // Cupom (opcional): valida server-side; desconto incide só no subtotal.
      let discount = 0;
      let appliedCode: string | null = null;
      if (couponCode) {
        appliedCode = normalizeCouponCode(couponCode);
        const check = await validateCoupon(appliedCode, subtotal);
        if (!check.valid) {
          return res
            .status(409)
            .json({ error: "Cupom inválido ou indisponível", code: "coupon_invalid", reason: check.reason });
        }
        discount = check.discount;
      }
      const total = Math.round((Math.max(0, subtotal - discount) + shipping) * 100) / 100;

      const order = await createOrderWithItems(
        {
          ...customer,
          orderNumber: generateOrderNumber(),
          subtotal: subtotal.toFixed(2),
          couponCode: appliedCode,
          discountAmount: discount.toFixed(2),
          shippingService: shippingService ?? null,
          shippingAmount: shipping.toFixed(2),
          total: total.toFixed(2),
        },
        resolved,
        appliedCode ? { code: appliedCode, subtotal } : undefined
      );
      // Marca o carrinho abandonado como convertido (só se o telefone bater —
      // evita converter o token de outra pessoa). Não bloqueia a resposta.
      if (cartToken) {
        const phoneDigits = (customer.customerPhone || "").replace(/\D/g, "");
        markAbandonedConverted(cartToken, order.id, phoneDigits).catch((e) =>
          console.error("[carts] markAbandonedConverted falhou:", e?.message)
        );
      }
      res.status(201).json({
        orderNumber: order.orderNumber,
        total: order.total,
        discountAmount: order.discountAmount,
      });
    } catch (err: any) {
      if (err instanceof CouponExhaustedError) {
        return res.status(409).json({ error: "Cupom esgotado — atualize o pedido", code: "coupon_exhausted" });
      }
      res.status(500).json({ error: err?.message || "Erro ao criar pedido" });
    }
  });

  return router;
}
