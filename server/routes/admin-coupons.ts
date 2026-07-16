// CRUD de cupons (admin). usedCount nunca é aceito do cliente. Datas YYYY-MM-DD
// viram início/fim do dia no fuso do servidor. Código normalizado + validado.
import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../auth";
import { listCoupons, createCoupon, updateCoupon, deleteCoupon } from "../storage";
import { normalizeCouponCode } from "../../shared/coupon-utils";
import type { coupons } from "../../shared/schema";

class BadRequest extends Error {}

const couponBase = z.object({
  code: z.string().min(3).max(32),
  type: z.enum(["percentage", "fixed"]),
  value: z.coerce.number().positive(),
  minOrderValue: z.coerce.number().nonnegative().nullable().optional(),
  maxUses: z.coerce.number().int().positive().nullable().optional(),
  validFrom: z.string().nullable().optional(), // YYYY-MM-DD
  validUntil: z.string().nullable().optional(),
  active: z.boolean().optional(),
});
const couponInput = couponBase.refine((d) => d.type !== "percentage" || d.value <= 100, {
  message: "Percentual deve ser entre 0 e 100",
  path: ["value"],
});

type CouponInput = z.infer<typeof couponBase>;

function startOfDay(s: string): Date {
  return new Date(`${s.slice(0, 10)}T00:00:00`);
}
function endOfDay(s: string): Date {
  return new Date(`${s.slice(0, 10)}T23:59:59.999`);
}

function buildPatch(d: Partial<CouponInput>): Partial<typeof coupons.$inferInsert> {
  const patch: Record<string, unknown> = {};
  if (d.code !== undefined) {
    const code = normalizeCouponCode(d.code);
    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
      throw new BadRequest("Código inválido (3-32 caracteres: A-Z, 0-9, - ou _).");
    }
    patch.code = code;
  }
  if (d.type === "percentage" && d.value != null && d.value > 100) {
    throw new BadRequest("Percentual deve ser entre 0 e 100.");
  }
  if (d.type !== undefined) patch.type = d.type;
  if (d.value !== undefined) patch.value = String(d.value);
  if (d.minOrderValue !== undefined) patch.minOrderValue = d.minOrderValue != null ? String(d.minOrderValue) : null;
  if (d.maxUses !== undefined) patch.maxUses = d.maxUses ?? null;
  if (d.validFrom !== undefined) patch.validFrom = d.validFrom ? startOfDay(d.validFrom) : null;
  if (d.validUntil !== undefined) patch.validUntil = d.validUntil ? endOfDay(d.validUntil) : null;
  if (d.active !== undefined) patch.active = d.active;
  const vf = patch.validFrom as Date | null | undefined;
  const vu = patch.validUntil as Date | null | undefined;
  if (vf && vu && vu < vf) throw new BadRequest("A validade final deve ser após a inicial.");
  return patch as Partial<typeof coupons.$inferInsert>;
}

export function adminCouponsRouter(): Router {
  const router = Router();
  router.use(requireRole("admin"));

  router.get("/", async (_req, res) => {
    res.json(await listCoupons());
  });

  router.post("/", async (req, res) => {
    const parsed = couponInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    }
    try {
      const data = buildPatch(parsed.data) as typeof coupons.$inferInsert;
      const coupon = await createCoupon(data);
      res.status(201).json(coupon);
    } catch (err: any) {
      if (err instanceof BadRequest) return res.status(400).json({ error: err.message });
      if (err?.code === "23505") return res.status(409).json({ error: "Já existe um cupom com este código." });
      throw err;
    }
  });

  router.put("/:id", async (req, res) => {
    const parsed = couponBase.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    }
    try {
      const patch = buildPatch(parsed.data);
      const coupon = await updateCoupon(Number(req.params.id), patch);
      if (!coupon) return res.status(404).json({ error: "Cupom não encontrado" });
      res.json(coupon);
    } catch (err: any) {
      if (err instanceof BadRequest) return res.status(400).json({ error: err.message });
      if (err?.code === "23505") return res.status(409).json({ error: "Já existe um cupom com este código." });
      throw err;
    }
  });

  router.delete("/:id", async (req, res) => {
    await deleteCoupon(Number(req.params.id));
    res.status(204).send();
  });

  return router;
}
