import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "../auth";
import {
  listAllProductsAdmin,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  listCategories,
} from "../storage";
import { insertProductSchema } from "../../shared/schema";

const MAX_FEATURED = 8;

const upload = multer({
  storage: multer.diskStorage({
    destination: path.resolve(process.cwd(), "uploads/products"),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".webp";
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
});

export function adminProductsRouter(): Router {
  const router = Router();
  router.use(requireAdmin);

  router.get("/", async (_req, res) => {
    const [products, categories] = await Promise.all([
      listAllProductsAdmin(),
      listCategories(),
    ]);
    res.json({ products, categories });
  });

  router.get("/:id", async (req, res) => {
    const product = await getProductById(Number(req.params.id));
    if (!product) return res.status(404).json({ error: "Produto não encontrado" });
    res.json(product);
  });

  router.post("/", async (req, res) => {
    const parsed = insertProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    }
    const product = await createProduct(parsed.data);
    res.status(201).json(product);
  });

  router.put("/:id", async (req, res) => {
    const parsed = insertProductSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    }
    const product = await updateProduct(Number(req.params.id), parsed.data);
    if (!product) return res.status(404).json({ error: "Produto não encontrado" });
    res.json(product);
  });

  router.delete("/:id", async (req, res) => {
    await deleteProduct(Number(req.params.id));
    res.status(204).send();
  });

  router.post("/:id/image", upload.single("image"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Nenhuma imagem enviada" });
    const imageUrl = `/uploads/products/${req.file.filename}`;
    const product = await updateProduct(Number(req.params.id), { image: imageUrl });
    if (!product) return res.status(404).json({ error: "Produto não encontrado" });
    res.json(product);
  });

  router.put("/:id/featured", async (req, res) => {
    const featured = !!req.body?.featured;
    if (featured) {
      const all = await listAllProductsAdmin();
      const currentCount = all.filter((p) => p.featured && p.id !== Number(req.params.id)).length;
      if (currentCount >= MAX_FEATURED) {
        return res.status(400).json({
          error: `Limite de ${MAX_FEATURED} produtos em destaque atingido. Remova um antes de adicionar outro.`,
        });
      }
    }
    const product = await updateProduct(Number(req.params.id), { featured });
    if (!product) return res.status(404).json({ error: "Produto não encontrado" });
    res.json(product);
  });

  return router;
}
