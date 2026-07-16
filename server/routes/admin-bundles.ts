import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../auth";
import {
  listAllBundlesAdmin,
  createBundleWithItems,
  updateBundleWithItems,
  deleteBundle,
} from "../storage";

const bundleSchema = z.object({
  slug: z.string().min(1).max(80),
  i18n: z.object({
    pt: z.object({ name: z.string().min(1), description: z.string().optional() }),
    en: z.object({ name: z.string().min(1), description: z.string().optional() }).optional(),
  }),
  image: z.string().nullable().optional(),
  discountType: z.enum(["percentage", "fixed", "fixed_price"]),
  discountValue: z.coerce.number().finite().nonnegative().max(999999),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive().max(20) })).min(1),
});

export function adminBundlesRouter(): Router {
  const router = Router();
  router.use(requireRole("admin", "operacao"));

  router.get("/", async (_req, res) => {
    res.json(await listAllBundlesAdmin());
  });

  router.post("/", async (req, res) => {
    const parsed = bundleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    const { items, ...data } = parsed.data;
    try {
      const b = await createBundleWithItems({ ...data, discountValue: String(data.discountValue) }, items);
      res.status(201).json(b);
    } catch (err: any) {
      if (err?.code === "23505") return res.status(409).json({ error: "Já existe um kit com este slug" });
      throw err;
    }
  });

  router.put("/:id", async (req, res) => {
    const parsed = bundleSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Dados inválidos" });
    const { items, ...data } = parsed.data;
    const patch: Record<string, unknown> = { ...data };
    if (data.discountValue != null) patch.discountValue = String(data.discountValue);
    try {
      const b = await updateBundleWithItems(Number(req.params.id), patch, items);
      if (!b) return res.status(404).json({ error: "Kit não encontrado" });
      res.json(b);
    } catch (err: any) {
      if (err?.code === "23505") return res.status(409).json({ error: "Já existe um kit com este slug" });
      throw err;
    }
  });

  router.delete("/:id", async (req, res) => {
    const b = await deleteBundle(Number(req.params.id));
    if (!b) return res.status(404).json({ error: "Kit não encontrado" });
    res.status(204).send();
  });

  return router;
}
