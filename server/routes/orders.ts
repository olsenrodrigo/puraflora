import { Router } from "express";
import { z } from "zod";
import { createOrderWithItems, getProductBySlug } from "../storage";
import type { ProductRow } from "../../shared/schema";

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
  // chaves extras (preços enviados pelo front) são ignoradas — recalculamos tudo
  items: z.array(orderItemSchema).min(1),
});

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
    const { items, shippingAmount, shippingService, ...customer } = parsed.data;

    try {
      // Recalcula preços a partir do catálogo (fonte de verdade)
      const resolved = [];
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

      const subtotal = resolved.reduce((s, it) => s + Number(it.totalPrice), 0);
      const shipping = sanitizeShipping(shippingAmount);
      const total = Math.round((subtotal + shipping) * 100) / 100;

      const order = await createOrderWithItems(
        {
          ...customer,
          orderNumber: generateOrderNumber(),
          subtotal: subtotal.toFixed(2),
          shippingService: shippingService ?? null,
          shippingAmount: shipping.toFixed(2),
          total: total.toFixed(2),
        },
        resolved
      );
      res.status(201).json({ orderNumber: order.orderNumber, total: order.total });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Erro ao criar pedido" });
    }
  });

  return router;
}
