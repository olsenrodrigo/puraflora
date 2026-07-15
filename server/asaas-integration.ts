// Cola entre o conector Asaas e o domínio do PuraFlora.
// Centraliza a atualização de status de pagamento (usada pelo webhook E pelo
// poller de reconciliação — mesmas regras, fontes diferentes), a
// materialização de pedidos de assinatura e a auto-etiqueta SmartEnvios.
import { and, eq, isNull } from "drizzle-orm";
import { loadConfig as loadAsaasConfig, type AsaasConfig } from "./asaas/config";
import { getPayment, cancelPayment, PAID_STATUSES } from "./asaas/index";
import type { AsaasPayment } from "./asaas/types";
import { db } from "./db";
import { orders, orderItems, paymentTransactions } from "../shared/schema";
import {
  loadConfig as loadSmartEnviosConfig,
  createOrder as smartEnviosCreateOrder,
  generateLabel as smartEnviosGenerateLabel,
} from "./smartenvios/index";
import {
  getTransactionByGatewayPaymentId,
  updatePaymentTransaction,
  updateOrderPayment,
  getOrderById,
  getOrderByNumber,
  getSubscriptionByGatewayId,
  getProductBySlug,
  getTransactionsByOrder,
  listOpenTransactions,
  ensurePaymentTransaction,
  listUnprocessedWebhookEvents,
  markWebhookEventProcessed,
} from "./storage";

export function getAsaasConfig(): AsaasConfig {
  return loadAsaasConfig(process.env);
}

/** Mapeia o status do Asaas para o paymentStatus simplificado do pedido. */
export function mapPaymentStatus(asaasStatus: string): string {
  if (PAID_STATUSES.includes(asaasStatus as (typeof PAID_STATUSES)[number])) return "paid";
  switch (asaasStatus) {
    case "PENDING":
    case "AWAITING_RISK_ANALYSIS":
      return "pending";
    case "OVERDUE":
      return "overdue";
    case "REFUNDED":
      return "refunded";
    case "PARTIALLY_REFUNDED":
      return "partially_refunded";
    case "REFUND_REQUESTED":
    case "REFUND_IN_PROGRESS":
      return "paid"; // dinheiro ainda não devolvido
    case "CHARGEBACK_REQUESTED":
    case "CHARGEBACK_DISPUTE":
    case "AWAITING_CHARGEBACK_REVERSAL":
      return "chargeback";
    default:
      return "pending";
  }
}

function generateOrderNumber(): string {
  return `PF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

type Trx = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface SnapshotItem {
  productSlug: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

/**
 * Gera etiqueta SmartEnvios automaticamente para um pedido pago
 * (apenas quando ASAAS_AUTO_LABEL=1). Falhas não propagam — o pedido já está
 * pago; a etiqueta pode ser gerada manualmente depois.
 */
async function autoLabelOrder(orderId: number): Promise<void> {
  try {
    const order = await getOrderById(orderId);
    if (!order || order.trackingCode) return;

    const seCfg = loadSmartEnviosConfig(process.env);
    const items = await Promise.all(
      order.items.map(async (it) => {
        const p = await getProductBySlug(it.productSlug);
        return {
          description: it.productName,
          amount: it.quantity,
          unitPrice: Number(it.unitPrice),
          totalPrice: Number(it.totalPrice),
          weight: (p?.weightG ?? 300) / 1000,
          height: Number(p?.heightCm ?? 6),
          width: Number(p?.widthCm ?? 6),
          length: Number(p?.lengthCm ?? 11),
        };
      })
    );

    const seOrder = await smartEnviosCreateOrder(seCfg, {
      preferenceBy: "QUOTE_VALUE",
      externalOrderId: order.orderNumber,
      recipient: {
        name: order.customerName,
        document: "",
        zipcode: order.shippingCep,
        street: order.shippingAddress,
        number: order.shippingNumber,
        complement: order.shippingComplement ?? "",
        neighborhood: order.shippingDistrict,
        phone: order.customerPhone,
        email: order.customerEmail ?? "",
      },
      items,
    });

    const label = await smartEnviosGenerateLabel(seCfg, {
      ...(seOrder.orderId
        ? { orderIds: [seOrder.orderId] }
        : seOrder.trackingCode
          ? { trackingCodes: [seOrder.trackingCode] }
          : {}),
      type: "pdf",
    });

    await updateOrderPayment(orderId, {
      trackingCode: seOrder.trackingCode ?? null,
      labelUrl: label?.url ?? null,
    });
    console.log(`[asaas] auto-etiqueta gerada para pedido ${order.orderNumber} (rastreio ${seOrder.trackingCode})`);
  } catch (err) {
    console.error(`[asaas] auto-etiqueta falhou para pedido ${orderId}:`, err);
  }
}

/**
 * Aplica uma atualização de pagamento vinda do Asaas (webhook ou poller).
 * Os efeitos da transição para pago (materializar assinatura, marcar pago,
 * auto-etiqueta) são reivindicados ATOMICAMENTE (claimPaidEffects): rodam uma
 * única vez mesmo com webhook + poller + checkout concorrentes.
 */
export async function applyPaymentUpdate(cfg: AsaasConfig, payment: AsaasPayment): Promise<void> {
  // Resolve/garante a transaction:
  //  - existente por gatewayPaymentId (dedup pelo unique)
  //  - cobrança de assinatura ainda desconhecida → cria
  //  - pagamento "órfão" (crash entre createPayment e gravar a tx no checkout):
  //    religa ao pedido via externalReference (orderNumber)
  let tx = await getTransactionByGatewayPaymentId(payment.id);
  if (!tx) {
    let orphanOrderId: number | null = null;
    if (!payment.subscription && payment.externalReference) {
      const order = await getOrderByNumber(payment.externalReference);
      if (order) orphanOrderId = order.id;
    }
    if (payment.subscription || orphanOrderId) {
      tx = await ensurePaymentTransaction({
        orderId: orphanOrderId,
        gateway: "asaas",
        gatewayPaymentId: payment.id,
        gatewayCustomerId: payment.customer,
        method: payment.billingType === "UNDEFINED" ? "PIX" : payment.billingType,
        status: "PENDING",
        value: String(payment.value),
        dueDate: payment.dueDate,
        invoiceUrl: payment.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl,
        rawResponse: payment as unknown as Record<string, unknown>,
      });
    }
  }
  if (!tx) {
    console.warn(`[asaas] pagamento ${payment.id} sem transaction local — ignorado`);
    return;
  }

  const wasClaimed = tx.paidEffectsAt != null;
  const isPaid = PAID_STATUSES.includes(payment.status);

  await updatePaymentTransaction(tx.id, {
    status: payment.status,
    netValue: payment.netValue != null ? String(payment.netValue) : undefined,
    invoiceUrl: payment.invoiceUrl ?? undefined,
    bankSlipUrl: payment.bankSlipUrl ?? undefined,
    rawResponse: payment as unknown as Record<string, unknown>,
  });

  const txId = tx.id;
  let orderId = tx.orderId;

  if (isPaid) {
    // Snapshot da assinatura (leitura fora da transação)
    const sub = payment.subscription
      ? await getSubscriptionByGatewayId(payment.subscription)
      : null;

    // Claim + materialização + marcar-pago são ATÔMICOS: se algo falhar, o
    // rollback também desfaz o claim, e o poller reprocessa sem perder efeito
    // nem duplicar pedido.
    let claimed = false;
    await db.transaction(async (trx) => {
      const claimRows = await trx
        .update(paymentTransactions)
        .set({ paidEffectsAt: new Date() })
        .where(and(eq(paymentTransactions.id, txId), isNull(paymentTransactions.paidEffectsAt)))
        .returning({ id: paymentTransactions.id });
      if (claimRows.length === 0) return; // outro processo já é o dono
      claimed = true;

      if (!orderId && sub) {
        const items = (sub.itemsSnapshot as SnapshotItem[]) ?? [];
        const subtotal = items.reduce((s, it) => s + Number(it.totalPrice), 0);
        const [order] = await trx
          .insert(orders)
          .values({
            orderNumber: generateOrderNumber(),
            customerName: sub.customerName,
            customerEmail: sub.customerEmail,
            customerPhone: sub.customerPhone,
            shippingCep: sub.shippingCep,
            shippingAddress: sub.shippingAddress,
            shippingNumber: sub.shippingNumber,
            shippingComplement: sub.shippingComplement,
            shippingDistrict: sub.shippingDistrict,
            shippingCity: sub.shippingCity,
            shippingState: sub.shippingState,
            notes: `Assinatura ${sub.gatewaySubscriptionId} — ciclo ${sub.cycle}`,
            subtotal: subtotal.toFixed(2),
            shippingService: sub.shippingService,
            shippingAmount: sub.shippingAmount,
            total: sub.value,
            status: "pago",
            paymentStatus: "paid",
            paidAt: new Date(),
            subscriptionId: sub.id,
          })
          .returning();
        if (items.length) {
          await trx.insert(orderItems).values(items.map((it) => ({ ...it, orderId: order.id })));
        }
        orderId = order.id;
        await trx.update(paymentTransactions).set({ orderId }).where(eq(paymentTransactions.id, txId));
      } else if (orderId) {
        await trx
          .update(orders)
          .set({ paymentStatus: "paid", paidAt: new Date(), status: "pago" })
          .where(eq(orders.id, orderId));
      }
    });

    // Efeitos externos APÓS o commit (não ficam presos numa transação de DB)
    if (claimed && orderId) {
      await cancelSiblingCharges(cfg, orderId, payment.id);
      if (cfg.autoLabel) await autoLabelOrder(orderId);
    } else if (!claimed && orderId) {
      await updateOrderPayment(orderId, { paymentStatus: "paid" }); // idempotente
    }
    return;
  }

  // Não-pago. Estorno/chargeback sempre refletem. Mas NÃO regride um pedido já
  // pago para pending/overdue por replay de evento antigo.
  if (orderId) {
    const mapped = mapPaymentStatus(payment.status);
    const isDowngrade = mapped === "pending" || mapped === "overdue";
    if (!(wasClaimed && isDowngrade)) {
      await updateOrderPayment(orderId, { paymentStatus: mapped });
    }
  }
}

/** Cancela outras cobranças abertas do mesmo pedido (evita pagar PIX e boleto). */
async function cancelSiblingCharges(
  cfg: AsaasConfig,
  orderId: number,
  paidPaymentId: string
): Promise<void> {
  try {
    const siblings = (await getTransactionsByOrder(orderId)).filter(
      (t) =>
        t.gatewayPaymentId !== paidPaymentId &&
        ["PENDING", "AWAITING_RISK_ANALYSIS"].includes(t.status)
    );
    for (const s of siblings) {
      try {
        await cancelPayment(cfg, s.gatewayPaymentId);
        await updatePaymentTransaction(s.id, { status: "CANCELLED" });
      } catch (err) {
        console.error(`[asaas] falha ao cancelar cobrança irmã ${s.gatewayPaymentId}:`, err);
      }
    }
  } catch (err) {
    console.error("[asaas] cancelSiblingCharges falhou:", err);
  }
}

/**
 * Poller de reconciliação: consulta no Asaas as transações ainda abertas e
 * aplica as mudanças de status. Cobre dev local sem túnel de webhook, fila
 * de webhooks interrompida e eventos perdidos.
 */
export function startReconciler(cfg: AsaasConfig): NodeJS.Timeout | null {
  if (!cfg.reconcileMinutes || cfg.mock) return null;
  const interval = setInterval(async () => {
    // (a) reprocessa webhooks que ficaram sem processar (falha pós-ACK) —
    //     cobre inclusive cobranças recorrentes ainda desconhecidas.
    try {
      const pending = await listUnprocessedWebhookEvents(50);
      for (const ev of pending) {
        try {
          const payload = ev.payload as { payment?: AsaasPayment } | null;
          if (payload?.payment) await applyPaymentUpdate(cfg, payload.payment);
          await markWebhookEventProcessed(ev.id);
        } catch (err) {
          await markWebhookEventProcessed(
            ev.id,
            err instanceof Error ? err.message : String(err)
          ).catch(() => {});
        }
      }
    } catch (err) {
      console.error("[asaas] reprocesso de webhooks falhou:", err);
    }

    // (b) reconcilia transações locais ainda abertas consultando o Asaas.
    try {
      const open = await listOpenTransactions();
      for (const tx of open) {
        try {
          const payment = await getPayment(cfg, tx.gatewayPaymentId);
          if (payment.status !== tx.status) {
            await applyPaymentUpdate(cfg, payment);
          }
        } catch (err) {
          console.error(`[asaas] reconciliação falhou para ${tx.gatewayPaymentId}:`, err);
        }
      }
    } catch (err) {
      console.error("[asaas] ciclo de reconciliação falhou:", err);
    }
  }, cfg.reconcileMinutes * 60 * 1000);
  interval.unref();
  console.log(`[asaas] reconciliador ativo (a cada ${cfg.reconcileMinutes} min)`);
  return interval;
}
