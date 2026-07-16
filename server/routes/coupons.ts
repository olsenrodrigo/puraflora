// Rota pública de validação de cupom. NÃO conta uso — a contagem só acontece
// no fechamento do pedido (POST /api/orders). Devolve `reason` machine-readable
// (o texto PT/EN fica no front).
import { Router } from "express";
import { z } from "zod";
import { validateCoupon } from "../storage";

const schema = z.object({
  code: z.string().min(1).max(64),
  subtotal: z.union([z.string(), z.number()]),
});

export function couponsRouter(): Router {
  const router = Router();

  router.post("/validate", async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Dados inválidos" });

    const n = Number(parsed.data.subtotal);
    const subtotal = Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;

    const result = await validateCoupon(parsed.data.code, subtotal);
    // Status 200 mesmo quando inválido — é resposta de negócio, não erro
    // (simplifica o fluxo silencioso do link ?cupom=).
    if (result.valid) {
      return res.json({
        valid: true,
        code: result.coupon.code,
        type: result.coupon.type,
        value: Number(result.coupon.value),
        discount: result.discount,
        minOrderValue: result.coupon.minOrderValue != null ? String(result.coupon.minOrderValue) : null,
      });
    }
    return res.json({
      valid: false,
      reason: result.reason,
      minOrderValue: result.minOrderValue,
      // no caso min_order, type/value permitem o front "armar" o cupom
      type: result.type,
      value: result.value,
    });
  });

  return router;
}
