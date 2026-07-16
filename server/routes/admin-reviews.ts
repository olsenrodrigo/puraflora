import { Router } from "express";
import { requireRole } from "../auth";
import {
  listReviewsAdmin,
  moderateReview,
  deleteReview,
  countPendingReviews,
} from "../storage";

function moderator(req: any): string {
  return req.admin?.email || "admin";
}

export function adminReviewsRouter(): Router {
  const router = Router();
  router.use(requireRole("admin", "operacao"));

  router.get("/", async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 50;
    res.json(await listReviewsAdmin({ status, limit, offset: (page - 1) * limit }));
  });

  router.get("/pending-count", async (_req, res) => {
    res.json({ count: await countPendingReviews() });
  });

  router.patch("/:id", async (req, res) => {
    const status = typeof req.body?.status === "string" ? req.body.status : null;
    if (!status || !["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: "Status inválido" });
    }
    const adminReply =
      typeof req.body?.adminReply === "string" ? req.body.adminReply.slice(0, 2000) : undefined;
    const updated = await moderateReview(Number(req.params.id), { status, adminReply }, moderator(req));
    if (!updated) return res.status(404).json({ error: "Avaliação não encontrada" });
    res.json(updated);
  });

  router.delete("/:id", async (req, res) => {
    const row = await deleteReview(Number(req.params.id));
    if (!row) return res.status(404).json({ error: "Avaliação não encontrada" });
    res.status(204).send();
  });

  return router;
}
