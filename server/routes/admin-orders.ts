import { Router } from "express";
import { requireAdmin } from "../auth";
import { listOrders, getOrderById } from "../storage";

export function adminOrdersRouter(): Router {
  const router = Router();
  router.use(requireAdmin);

  router.get("/", async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const { orders, total } = await listOrders(page, limit);
    res.json({ orders, total, page, pages: Math.ceil(total / limit) });
  });

  router.get("/:id", async (req, res) => {
    const order = await getOrderById(Number(req.params.id));
    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
    res.json(order);
  });

  return router;
}
