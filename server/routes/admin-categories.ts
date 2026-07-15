import { Router } from "express";
import { requireAdmin } from "../auth";
import {
  listAllCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  countProductsByCategory,
} from "../storage";
import { insertCategorySchema } from "../../shared/schema";

export function adminCategoriesRouter(): Router {
  const router = Router();
  router.use(requireAdmin);

  router.get("/", async (_req, res) => {
    const categories = await listAllCategoriesAdmin();
    res.json(categories);
  });

  router.post("/", async (req, res) => {
    const parsed = insertCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    }
    try {
      const category = await createCategory(parsed.data);
      res.status(201).json(category);
    } catch (err: any) {
      if (err?.code === "23505") {
        return res.status(409).json({ error: "Já existe uma categoria com este identificador" });
      }
      throw err;
    }
  });

  router.put("/:id", async (req, res) => {
    const parsed = insertCategorySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    }
    const category = await updateCategory(req.params.id, parsed.data);
    if (!category) return res.status(404).json({ error: "Categoria não encontrada" });
    res.json(category);
  });

  router.delete("/:id", async (req, res) => {
    const inUse = await countProductsByCategory(req.params.id);
    if (inUse > 0) {
      return res.status(409).json({
        error: `Categoria em uso por ${inUse} produto${inUse > 1 ? "s" : ""}. Mova ou exclua os produtos antes de excluir a categoria.`,
      });
    }
    await deleteCategory(req.params.id);
    res.status(204).send();
  });

  return router;
}
