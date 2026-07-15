// Rotas públicas de pagamento online (Asaas): checkout de pedido,
// assinatura e polling de status. A chave da API nunca chega ao navegador.
// Valores são SEMPRE recalculados no servidor (nunca confiar no cliente).
import { Router, type Request } from "express";
import { z } from "zod";
import {
  ensureCustomer,
  createPayment,
  getPixQrCode,
  getBoletoIdentification,
  createSubscription,
  listSubscriptionPayments,
} from "../asaas/index";
import { getAsaasConfig, applyPaymentUpdate, mapPaymentStatus } from "../asaas-integration";
import {
  loadConfig as loadSmartEnviosConfig,
  quoteFreight,
  priceQuotes,
} from "../smartenvios/index";
import {
  getOrderById,
  getOrderByNumber,
  ensurePaymentTransaction,
  updateOrderPayment,
  updateOrderTotals,
  getTransactionsByOrder,
  createSubscriptionRow,
  getProductBySlug,
} from "../storage";
import type { ProductRow } from "../../shared/schema";

const creditCardSchema = z.object({
  holderName: z.string().min(1),
  number: z.string().min(13).max(19),
  expiryMonth: z.string().length(2),
  expiryYear: z.string().length(4),
  ccv: z.string().min(3).max(4),
});

const holderInfoSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  cpfCnpj: z.string().min(11),
  postalCode: z.string().min(8),
  addressNumber: z.string().min(1),
  phone: z.string().optional(),
});

const checkoutSchema = z.object({
  orderNumber: z.string().min(1),
  billingType: z.enum(["PIX", "BOLETO", "CREDIT_CARD"]),
  cpfCnpj: z.string().min(11).max(18),
  installmentCount: z.number().int().min(1).max(21).optional(),
  creditCard: creditCardSchema.optional(),
  creditCardHolderInfo: holderInfoSchema.optional(),
});

const subscribeSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email().nullable().optional(),
  customerPhone: z.string().min(8),
  cpfCnpj: z.string().min(11).max(18),
  shippingCep: z.string().min(8),
  shippingAddress: z.string().min(1),
  shippingNumber: z.string().min(1),
  shippingComplement: z.string().nullable().optional(),
  shippingDistrict: z.string().min(1),
  shippingCity: z.string().min(1),
  shippingState: z.string().min(2),
  billingType: z.enum(["PIX", "BOLETO", "CREDIT_CARD"]),
  cycle: z
    .enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "BIMONTHLY", "QUARTERLY", "SEMIANNUALLY", "YEARLY"])
    .default("MONTHLY"),
  shippingAmount: z.union([z.string(), z.number()]).optional(),
  shippingService: z.string().nullable().optional(),
  items: z
    .array(z.object({ productSlug: z.string().min(1), quantity: z.number().int().positive().max(99) }))
    .min(1),
  creditCard: creditCardSchema.optional(),
  creditCardHolderInfo: holderInfoSchema.optional(),
});

function clientIp(req: Request): string {
  // req.ip respeita "trust proxy" (configurado no server/index.ts). Não usar
  // X-Forwarded-For cru, que é falsificável por qualquer cliente.
  return req.ip || req.socket.remoteAddress || "127.0.0.1";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function isoInDays(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}
function productName(p: ProductRow): string {
  const i18n = p.i18n as Record<string, { name?: string }> | null;
  return i18n?.pt?.name ?? p.slug;
}
function sanitizeShipping(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

/**
 * Recomputa o frete no servidor via SmartEnvios (não confiar no valor do
 * cliente). Retorna o preço do serviço escolhido, ou o mais barato, ou — se a
 * cotação falhar — o fallback informado (para não travar o pagamento).
 * Só é chamado no fluxo de pagamento ONLINE (não onera o checkout WhatsApp).
 */
async function resolveServerShipping(
  cep: string,
  items: Array<{ productSlug: string; quantity: number }>,
  subtotal: number,
  requestedService: string | null,
  fallback: number
): Promise<number> {
  try {
    const seCfg = loadSmartEnviosConfig(process.env);
    const volumes = [];
    for (const it of items) {
      const p = await getProductBySlug(it.productSlug);
      volumes.push({
        weight: (p?.weightG ?? 300) / 1000,
        height: Number(p?.heightCm ?? 6),
        width: Number(p?.widthCm ?? 6),
        length: Number(p?.lengthCm ?? 11),
        quantity: it.quantity,
        price: Number(p?.price ?? 0),
      });
    }
    const services = await quoteFreight(seCfg, {
      zipFrom: seCfg.sender.zipcode,
      zipTo: cep.replace(/\D/g, ""),
      volumes,
      totalPrice: subtotal,
    });
    const options = priceQuotes(seCfg, services, subtotal);
    if (!options.length) return fallback;
    const chosen =
      (requestedService && options.find((o) => o.service === requestedService)) ||
      options.reduce((min, o) => (o.finalValue < min.finalValue ? o : min), options[0]);
    return chosen.free ? 0 : Math.round(chosen.finalValue * 100) / 100;
  } catch {
    return fallback; // cotação indisponível → não bloqueia o pagamento
  }
}

const OPEN_STATUSES = ["PENDING", "AWAITING_RISK_ANALYSIS"];

export function paymentsRouter(): Router {
  const router = Router();
  const cfg = getAsaasConfig();

  if (cfg.mock) {
    console.log("[asaas] modo MOCK (defina ASAAS_API_KEY no .env para o modo real)");
  } else {
    console.log(`[asaas] conectado (${cfg.env})`);
  }

  router.get("/config", (_req, res) => {
    res.json({
      enabled: true,
      mock: cfg.mock,
      env: cfg.env,
      methods: ["PIX", "BOLETO", "CREDIT_CARD"],
      maxInstallments: cfg.maxInstallments,
      subscriptionsEnabled: true,
    });
  });

  // Cria (ou reaproveita) a cobrança de um pedido existente
  router.post("/checkout", async (req, res) => {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    }
    const input = parsed.data;

    try {
      const order = await getOrderByNumber(input.orderNumber);
      if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
      if (order.paymentStatus === "paid") {
        return res.status(409).json({ error: "Este pedido já está pago" });
      }

      // Reaproveita uma cobrança aberta do mesmo método (evita duplicar em
      // duplo-clique/reenvio). Cartão nunca reaproveita (autoriza na hora).
      if (input.billingType !== "CREDIT_CARD") {
        const existing = (await getTransactionsByOrder(order.id)).find(
          (t) => t.method === input.billingType && OPEN_STATUSES.includes(t.status)
        );
        if (existing) {
          const response: Record<string, unknown> = {
            mock: cfg.mock,
            paymentId: existing.gatewayPaymentId,
            status: existing.status,
            paymentStatus: mapPaymentStatus(existing.status),
            invoiceUrl: existing.invoiceUrl,
            reused: true,
          };
          if (input.billingType === "PIX") {
            const qr = await getPixQrCode(cfg, existing.gatewayPaymentId);
            response.pix = { encodedImage: qr.encodedImage, payload: qr.payload, expirationDate: qr.expirationDate };
          } else {
            response.boleto = {
              bankSlipUrl: existing.bankSlipUrl,
              identificationField: (await getBoletoIdentification(cfg, existing.gatewayPaymentId)).identificationField,
            };
          }
          return res.json(response);
        }
      }

      const customer = await ensureCustomer(cfg, {
        name: order.customerName,
        cpfCnpj: input.cpfCnpj,
        email: order.customerEmail ?? undefined,
        mobilePhone: order.customerPhone,
        postalCode: order.shippingCep,
        address: order.shippingAddress,
        addressNumber: order.shippingNumber,
        complement: order.shippingComplement ?? undefined,
        province: order.shippingDistrict,
        externalReference: order.customerPhone.replace(/\D/g, ""),
      });

      const isCard = input.billingType === "CREDIT_CARD";
      if (isCard && !input.creditCard) {
        return res.status(400).json({ error: "Dados do cartão são obrigatórios" });
      }

      // Recalcula o frete no servidor (subtotal já é confiável, vindo de /api/orders).
      // Charge = subtotal confiável + frete recotado; nunca o total enviado pelo cliente.
      const detail = await getOrderById(order.id);
      const chargeItems = (detail?.items ?? []).map((it) => ({
        productSlug: it.productSlug,
        quantity: it.quantity,
      }));
      const subtotal = Number(order.subtotal);
      const shipping = await resolveServerShipping(
        order.shippingCep,
        chargeItems,
        subtotal,
        order.shippingService,
        Number(order.shippingAmount)
      );
      const value = Math.round((subtotal + shipping) * 100) / 100;
      // sincroniza o pedido com os valores confiáveis, se divergirem
      if (Math.abs(value - Number(order.total)) >= 0.01) {
        await updateOrderTotals(order.id, shipping.toFixed(2), value.toFixed(2));
      }

      const payment = await createPayment(cfg, {
        customer: customer.id,
        billingType: input.billingType,
        value,
        dueDate: input.billingType === "BOLETO" ? isoInDays(3) : todayIso(),
        description: `Pedido ${order.orderNumber} — PuraFlora`,
        externalReference: order.orderNumber,
        ...(isCard && input.installmentCount && input.installmentCount > 1
          ? { installmentCount: input.installmentCount, totalValue: value }
          : {}),
        ...(isCard
          ? {
              creditCard: input.creditCard,
              creditCardHolderInfo: input.creditCardHolderInfo,
              remoteIp: clientIp(req),
            }
          : {}),
      });

      await ensurePaymentTransaction({
        orderId: order.id,
        gateway: "asaas",
        gatewayPaymentId: payment.id,
        gatewayCustomerId: customer.id,
        method: input.billingType,
        status: "PENDING",
        value: order.total,
        dueDate: payment.dueDate,
        invoiceUrl: payment.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl,
        installmentCount: input.installmentCount,
        rawResponse: payment as unknown as Record<string, unknown>,
      });
      // só marca pendente se o pedido ainda não tiver status de pagamento
      if (!order.paymentStatus) {
        await updateOrderPayment(order.id, { paymentStatus: "pending" });
      }

      // aplica o status real (cartão pode já vir CONFIRMED — dispara transição)
      await applyPaymentUpdate(cfg, payment);

      const response: Record<string, unknown> = {
        mock: cfg.mock,
        paymentId: payment.id,
        status: payment.status,
        paymentStatus: mapPaymentStatus(payment.status),
        invoiceUrl: payment.invoiceUrl,
      };
      if (input.billingType === "PIX") {
        const qr = await getPixQrCode(cfg, payment.id);
        response.pix = { encodedImage: qr.encodedImage, payload: qr.payload, expirationDate: qr.expirationDate };
      } else if (input.billingType === "BOLETO") {
        const boleto = await getBoletoIdentification(cfg, payment.id);
        response.boleto = { bankSlipUrl: payment.bankSlipUrl, identificationField: boleto.identificationField };
      }
      return res.json(response);
    } catch (err: any) {
      const status = err?.status >= 400 && err.status < 500 ? 400 : 500;
      return res.status(status).json({ error: err?.message || "Erro ao criar cobrança" });
    }
  });

  // Cria uma assinatura recorrente ("assine e receba todo mês")
  router.post("/subscribe", async (req, res) => {
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    }
    const input = parsed.data;

    try {
      // Recalcula itens e valor a partir do catálogo (fonte de verdade)
      const items = [];
      for (const it of input.items) {
        const product = await getProductBySlug(it.productSlug);
        if (!product || !product.active) {
          return res.status(400).json({ error: `Produto indisponível: ${it.productSlug}` });
        }
        const unit = Number(product.price);
        items.push({
          productSlug: product.slug,
          productName: productName(product),
          quantity: it.quantity,
          unitPrice: unit.toFixed(2),
          totalPrice: (Math.round(unit * it.quantity * 100) / 100).toFixed(2),
        });
      }
      const subtotal = items.reduce((s, it) => s + Number(it.totalPrice), 0);
      const shipping = await resolveServerShipping(
        input.shippingCep,
        input.items,
        subtotal,
        input.shippingService ?? null,
        sanitizeShipping(input.shippingAmount)
      );
      const total = Math.round((subtotal + shipping) * 100) / 100;

      const customer = await ensureCustomer(cfg, {
        name: input.customerName,
        cpfCnpj: input.cpfCnpj,
        email: input.customerEmail ?? undefined,
        mobilePhone: input.customerPhone,
        postalCode: input.shippingCep,
        address: input.shippingAddress,
        addressNumber: input.shippingNumber,
        province: input.shippingDistrict,
        externalReference: input.customerPhone.replace(/\D/g, ""),
      });

      const isCard = input.billingType === "CREDIT_CARD";
      if (isCard && !input.creditCard) {
        return res.status(400).json({ error: "Dados do cartão são obrigatórios" });
      }

      const subscription = await createSubscription(cfg, {
        customer: customer.id,
        billingType: input.billingType,
        value: total,
        nextDueDate: todayIso(),
        cycle: input.cycle,
        description: `Assinatura PuraFlora — ${items.map((i) => `${i.quantity}x ${i.productName}`).join(", ").slice(0, 400)}`,
        ...(isCard
          ? { creditCard: input.creditCard, creditCardHolderInfo: input.creditCardHolderInfo, remoteIp: clientIp(req) }
          : {}),
      });

      const subRow = await createSubscriptionRow({
        gatewaySubscriptionId: subscription.id,
        gatewayCustomerId: customer.id,
        customerName: input.customerName,
        customerEmail: input.customerEmail ?? null,
        customerPhone: input.customerPhone,
        customerCpfCnpj: input.cpfCnpj.replace(/\D/g, ""),
        shippingCep: input.shippingCep,
        shippingAddress: input.shippingAddress,
        shippingNumber: input.shippingNumber,
        shippingComplement: input.shippingComplement ?? null,
        shippingDistrict: input.shippingDistrict,
        shippingCity: input.shippingCity,
        shippingState: input.shippingState,
        billingType: input.billingType,
        cycle: input.cycle,
        value: total.toFixed(2),
        shippingAmount: shipping.toFixed(2),
        shippingService: input.shippingService ?? null,
        status: "ACTIVE",
        itemsSnapshot: items,
        nextDueDate: subscription.nextDueDate,
      });

      const response: Record<string, unknown> = {
        mock: cfg.mock,
        subscriptionId: subscription.id,
        localSubscriptionId: subRow.id,
        status: subscription.status,
      };

      // Primeira cobrança do ciclo (gerada pelo Asaas) — mostra o PIX/boleto já no checkout
      const firstPayments = await listSubscriptionPayments(cfg, subscription.id);
      const first = firstPayments[0];
      if (first) {
        await ensurePaymentTransaction({
          orderId: null,
          gateway: "asaas",
          gatewayPaymentId: first.id,
          gatewayCustomerId: customer.id,
          method: input.billingType,
          status: "PENDING",
          value: String(first.value),
          dueDate: first.dueDate,
          invoiceUrl: first.invoiceUrl,
          bankSlipUrl: first.bankSlipUrl,
          rawResponse: first as unknown as Record<string, unknown>,
        });
        await applyPaymentUpdate(cfg, first);
        response.firstPaymentId = first.id;
        response.invoiceUrl = first.invoiceUrl;
        if (input.billingType === "PIX") {
          const qr = await getPixQrCode(cfg, first.id);
          response.pix = { encodedImage: qr.encodedImage, payload: qr.payload };
        } else if (input.billingType === "BOLETO") {
          response.boleto = { bankSlipUrl: first.bankSlipUrl };
        }
      }

      return res.json(response);
    } catch (err: any) {
      const status = err?.status >= 400 && err.status < 500 ? 400 : 500;
      return res.status(status).json({ error: err?.message || "Erro ao criar assinatura" });
    }
  });

  // Polling do status de pagamento de um pedido
  router.get("/status/:orderNumber", async (req, res) => {
    const order = await getOrderByNumber(req.params.orderNumber);
    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
    const txs = await getTransactionsByOrder(order.id);
    res.json({
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      paidAt: order.paidAt,
      transactions: txs.map((t) => ({
        paymentId: t.gatewayPaymentId,
        method: t.method,
        status: t.status,
        value: t.value,
      })),
    });
  });

  return router;
}
