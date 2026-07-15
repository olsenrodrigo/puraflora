import { Router } from "express";
import { requireRole } from "../auth";
import {
  getReportsSummary,
  getMonthlyRevenue,
  getTopProducts,
  getTopCustomersByLtv,
  getAvgLtv,
} from "../storage";

function startDateForPeriod(period: string): Date {
  const now = new Date();
  switch (period) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    case "month":
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

export function adminReportsRouter(): Router {
  const router = Router();
  router.use(requireRole("admin", "financeiro"));

  router.get("/summary", async (req, res) => {
    const period = String(req.query.period || "month");
    const summary = await getReportsSummary(startDateForPeriod(period));
    res.json({ period, ...summary });
  });

  router.get("/monthly-revenue", async (_req, res) => {
    const data = await getMonthlyRevenue(12);
    res.json(data);
  });

  router.get("/top-products", async (req, res) => {
    const limit = Math.min(50, Number(req.query.limit) || 10);
    const data = await getTopProducts(limit);
    res.json(data);
  });

  router.get("/ltv", async (req, res) => {
    const limit = Math.min(50, Number(req.query.limit) || 10);
    const [avgLtv, topCustomers] = await Promise.all([
      getAvgLtv(),
      getTopCustomersByLtv(limit),
    ]);
    res.json({ avgLtv, topCustomers });
  });

  return router;
}
