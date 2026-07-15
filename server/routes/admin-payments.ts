// Rotas administrativas de pagamento (Asaas): estornos, links de pagamento,
// saldo/extrato, assinaturas e gestão do webhook.
import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../auth";
import {
  refundPayment,
  createPaymentLink,
  getBalance,
  listFinancialTransactions,
  listWebhooks,
  registerWebhook,
  cancelSubscription,
} from "../asaas/index";
import { getAsaasConfig, applyPaymentUpdate } from "../asaas-integration";
import { getPayment } from "../asaas/index";
import {
  getOrderById,
  getTransactionsByOrder,
  listTransactionsAdmin,
  getTransactionByGatewayPaymentId,
  listSubscriptionsAdmin,
  updateSubscriptionRow,
} from "../storage";

export function adminPaymentsRouter(): Router {
  const router = Router();
  const cfg = getAsaasConfig();

  // Visão financeira: admin + financeiro
  router.use(requireRole("admin", "financeiro"));

  // Status do conector (card de Integrações)
  router.get("/status", async (_req, res) => {
    let webhookOk = false;
    let webhookInterrupted = false;
    try {
      if (!cfg.mock) {
        const hooks = await listWebhooks(cfg);
        const ours = hooks.find((w) => w.url === cfg.webhookUrl);
        webhookOk = !!ours?.enabled;
        webhookInterrupted = !!ours?.interrupted;
      }
    } catch {
      /* status do webhook é informativo */
    }
    res.json({
      mock: cfg.mock,
      env: cfg.env,
      webhookUrl: cfg.webhookUrl || null,
      webhookConfigured: webhookOk,
      webhookInterrupted,
      autoLabel: cfg.autoLabel,
      reconcileMinutes: cfg.reconcileMinutes,
    });
  });

  router.get("/balance", async (_req, res) => {
    try {
      const [balance, statement] = await Promise.all([
        getBalance(cfg),
        listFinancialTransactions(cfg, 10),
      ]);
      res.json({ balance: balance.balance, statement });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Erro ao consultar saldo" });
    }
  });

  router.get("/transactions", async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const { transactions, total } = await listTransactionsAdmin(page, limit);
    res.json({ transactions, total, page, pages: Math.ceil(total / limit) });
  });

  router.get("/order/:orderId", async (req, res) => {
    const txs = await getTransactionsByOrder(Number(req.params.orderId));
    res.json(txs);
  });

  // Estorno (total ou parcial)
  router.post("/refund", async (req, res) => {
    const schema = z.object({
      paymentId: z.string().min(1),
      value: z.number().positive().optional(),
      description: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos" });
    }
    try {
      const tx = await getTransactionByGatewayPaymentId(parsed.data.paymentId);
      if (!tx) return res.status(404).json({ error: "Transação não encontrada" });

      const result = await refundPayment(
        cfg,
        parsed.data.paymentId,
        parsed.data.value,
        parsed.data.description
      );
      // sincroniza imediatamente (não espera webhook)
      const fresh = cfg.mock ? result : await getPayment(cfg, parsed.data.paymentId);
      await applyPaymentUpdate(cfg, fresh);
      res.json({ refunded: true, status: fresh.status });
    } catch (err: any) {
      const status = err?.status >= 400 && err.status < 500 ? 400 : 500;
      res.status(status).json({ error: err?.message || "Erro ao estornar" });
    }
  });

  // Link de pagamento para um pedido (ou avulso)
  router.post("/payment-link", async (req, res) => {
    const schema = z.object({
      orderId: z.number().int().positive().optional(),
      name: z.string().min(1).optional(),
      value: z.number().positive().optional(),
      description: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Dados inválidos" });

    try {
      let name = parsed.data.name;
      let value = parsed.data.value;
      let description = parsed.data.description;
      if (parsed.data.orderId) {
        const order = await getOrderById(parsed.data.orderId);
        if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
        name = name ?? `Pedido ${order.orderNumber} — PuraFlora`;
        value = value ?? Number(order.total);
        description =
          description ??
          order.items.map((i) => `${i.quantity}x ${i.productName}`).join(", ").slice(0, 400);
      }
      if (!name || !value) {
        return res.status(400).json({ error: "Informe orderId ou name + value" });
      }
      const link = await createPaymentLink(cfg, {
        name,
        value,
        description,
        billingType: "UNDEFINED",
        chargeType: "DETACHED",
        dueDateLimitDays: 5,
      });
      res.json(link);
    } catch (err: any) {
      const status = err?.status >= 400 && err.status < 500 ? 400 : 500;
      res.status(status).json({ error: err?.message || "Erro ao criar link" });
    }
  });

  // Assinaturas
  router.get("/subscriptions", async (_req, res) => {
    res.json(await listSubscriptionsAdmin());
  });

  router.post("/subscriptions/:id/cancel", async (req, res) => {
    try {
      const subs = await listSubscriptionsAdmin();
      const sub = subs.find((s) => s.id === Number(req.params.id));
      if (!sub) return res.status(404).json({ error: "Assinatura não encontrada" });
      await cancelSubscription(cfg, sub.gatewaySubscriptionId);
      const updated = await updateSubscriptionRow(sub.id, { status: "CANCELLED" });
      res.json(updated);
    } catch (err: any) {
      const status = err?.status >= 400 && err.status < 500 ? 400 : 500;
      res.status(status).json({ error: err?.message || "Erro ao cancelar assinatura" });
    }
  });

  // Registro do webhook no Asaas (admin apenas)
  router.post("/register-webhook", requireRole("admin"), async (req, res) => {
    try {
      const url = typeof req.body?.url === "string" ? req.body.url : undefined;
      const result = await registerWebhook(cfg, url ? { url } : undefined);
      res.json(result);
    } catch (err: any) {
      const status = err?.status >= 400 && err.status < 500 ? 400 : 500;
      res.status(status).json({ error: err?.message || "Erro ao registrar webhook" });
    }
  });

  return router;
}
