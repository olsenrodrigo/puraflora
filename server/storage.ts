import { eq, desc, sql, inArray, and, isNull, or } from "drizzle-orm";
import { db } from "./db";
import {
  adminUsers,
  categories,
  products,
  orders,
  orderItems,
  storeSettings,
  paymentTransactions,
  webhookEvents,
  subscriptions,
  coupons,
  type ProductRow,
  type Coupon,
} from "../shared/schema";
import { computeDiscount, normalizeCouponCode } from "../shared/coupon-utils";

// --- admin users ---

export async function getAdminByEmail(email: string) {
  const rows = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
  return rows[0];
}

export async function getAdminById(id: number) {
  const rows = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
  return rows[0];
}

export async function countAdmins() {
  const rows = await db.select().from(adminUsers);
  return rows.length;
}

export async function createAdminUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role?: string;
  mustChangePassword?: boolean;
}) {
  const rows = await db.insert(adminUsers).values(data).returning();
  return rows[0];
}

export async function listAdminUsers() {
  return db.select().from(adminUsers).orderBy(desc(adminUsers.createdAt));
}

export async function updateAdminUser(id: number, data: Partial<typeof adminUsers.$inferInsert>) {
  const rows = await db.update(adminUsers).set(data).where(eq(adminUsers.id, id)).returning();
  return rows[0];
}

export async function deleteAdminUser(id: number) {
  await db.delete(adminUsers).where(eq(adminUsers.id, id));
}

// --- categories ---

export async function listCategories() {
  return db.select().from(categories).where(eq(categories.active, true));
}

export async function listAllCategoriesAdmin() {
  return db.select().from(categories).orderBy(categories.sortOrder);
}

export async function upsertCategory(data: typeof categories.$inferInsert) {
  const rows = await db
    .insert(categories)
    .values(data)
    .onConflictDoUpdate({ target: categories.id, set: data })
    .returning();
  return rows[0];
}

export async function createCategory(data: typeof categories.$inferInsert) {
  const rows = await db.insert(categories).values(data).returning();
  return rows[0];
}

export async function updateCategory(id: string, data: Partial<typeof categories.$inferInsert>) {
  const rows = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
  return rows[0];
}

export async function countProductsByCategory(categoryId: string): Promise<number> {
  const rows = await db.select().from(products).where(eq(products.categoryId, categoryId));
  return rows.length;
}

export async function deleteCategory(id: string) {
  await db.delete(categories).where(eq(categories.id, id));
}

// --- products ---

export async function listActiveProducts(): Promise<ProductRow[]> {
  return db.select().from(products).where(eq(products.active, true));
}

export async function listAllProductsAdmin(): Promise<ProductRow[]> {
  return db.select().from(products).orderBy(desc(products.createdAt));
}

export async function getProductBySlug(slug: string) {
  const rows = await db.select().from(products).where(eq(products.slug, slug));
  return rows[0];
}

export async function getProductById(id: number) {
  const rows = await db.select().from(products).where(eq(products.id, id));
  return rows[0];
}

export async function upsertProductBySlug(data: typeof products.$inferInsert) {
  const rows = await db
    .insert(products)
    .values(data)
    .onConflictDoUpdate({ target: products.slug, set: { ...data, updatedAt: new Date() } })
    .returning();
  return rows[0];
}

export async function createProduct(data: typeof products.$inferInsert) {
  const rows = await db.insert(products).values(data).returning();
  return rows[0];
}

export async function updateProduct(id: number, data: Partial<typeof products.$inferInsert>) {
  const rows = await db
    .update(products)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
  return rows[0];
}

export async function deleteProduct(id: number) {
  await db.delete(products).where(eq(products.id, id));
}

// --- orders ---

export class CouponExhaustedError extends Error {
  constructor() {
    super("Cupom esgotado ou inválido");
    this.name = "CouponExhaustedError";
  }
}

export async function createOrderWithItems(
  orderData: typeof orders.$inferInsert,
  items: Array<Omit<typeof orderItems.$inferInsert, "orderId">>,
  couponClaim?: { code: string; subtotal: number }
) {
  // Transação: o claim atômico do cupom e a criação do pedido ficam consistentes
  // (rollback desfaz o incremento se o insert falhar). Corrige também o antigo
  // risco de pedido sem itens quando o 2º insert falhava.
  return db.transaction(async (tx) => {
    let data = orderData;
    if (couponClaim) {
      const claimed = await claimCouponUsage(couponClaim.code, couponClaim.subtotal, tx);
      if (!claimed) throw new CouponExhaustedError();
      // Fonte de verdade do desconto = o cupom REALMENTE reivindicado (fecha o
      // TOCTOU se o admin mudar type/value entre a validação e o claim).
      const sub = Number(orderData.subtotal);
      const ship = Number(orderData.shippingAmount ?? 0);
      const disc = computeDiscount(claimed.type, Number(claimed.value), sub);
      const total = Math.round((Math.max(0, sub - disc) + ship) * 100) / 100;
      data = { ...orderData, discountAmount: disc.toFixed(2), total: total.toFixed(2) };
    }
    const rows = await tx.insert(orders).values(data).returning();
    const order = rows[0];
    if (items.length) {
      await tx.insert(orderItems).values(items.map((it) => ({ ...it, orderId: order.id })));
    }
    return order;
  });
}

// --- cupons ---
export type CouponRejection =
  | "not_found"
  | "inactive"
  | "not_started"
  | "expired"
  | "exhausted"
  | "min_order";

export async function listCoupons(): Promise<Coupon[]> {
  return db.select().from(coupons).orderBy(desc(coupons.createdAt));
}

export async function getCouponByCode(code: string): Promise<Coupon | undefined> {
  const rows = await db.select().from(coupons).where(eq(coupons.code, normalizeCouponCode(code)));
  return rows[0];
}

export async function createCoupon(data: typeof coupons.$inferInsert): Promise<Coupon> {
  const rows = await db
    .insert(coupons)
    .values({ ...data, code: normalizeCouponCode(data.code) })
    .returning();
  return rows[0];
}

export async function updateCoupon(
  id: number,
  data: Partial<typeof coupons.$inferInsert>
): Promise<Coupon | undefined> {
  const patch: Partial<typeof coupons.$inferInsert> = { ...data };
  delete (patch as { usedCount?: number }).usedCount; // nunca pelo admin
  if (patch.code) patch.code = normalizeCouponCode(patch.code);
  const rows = await db.update(coupons).set(patch).where(eq(coupons.id, id)).returning();
  return rows[0];
}

export async function deleteCoupon(id: number): Promise<void> {
  await db.delete(coupons).where(eq(coupons.id, id));
}

/**
 * Claim ATÔMICO de 1 uso: revalida (ativo, janela de datas, limite, mínimo) e
 * incrementa na MESMA instrução SQL. O row-lock serializa concorrentes e o WHERE
 * é reavaliado após o lock (READ COMMITTED) — na corrida do último uso, só 1 vence.
 * Retorna a linha atualizada, ou null se qualquer condição falhou.
 */
export async function claimCouponUsage(
  code: string,
  subtotal: number,
  exec: any = db
): Promise<Coupon | null> {
  const rows = await exec
    .update(coupons)
    .set({ usedCount: sql`${coupons.usedCount} + 1` })
    .where(
      and(
        eq(coupons.code, normalizeCouponCode(code)),
        eq(coupons.active, true),
        or(isNull(coupons.maxUses), sql`${coupons.usedCount} < ${coupons.maxUses}`),
        or(isNull(coupons.validFrom), sql`${coupons.validFrom} <= now()`),
        or(isNull(coupons.validUntil), sql`${coupons.validUntil} >= now()`),
        or(isNull(coupons.minOrderValue), sql`${coupons.minOrderValue} <= ${subtotal}`)
      )
    )
    .returning();
  return rows[0] ?? null;
}

/** Compensação: só usada se um claim fora de transação precisar ser desfeito. */
export async function releaseCouponUsage(code: string): Promise<void> {
  await db
    .update(coupons)
    .set({ usedCount: sql`greatest(${coupons.usedCount} - 1, 0)` })
    .where(eq(coupons.code, normalizeCouponCode(code)));
}

/** Validação SEM efeito colateral (para o POST /api/coupons/validate). */
export async function validateCoupon(
  code: string,
  subtotal: number
): Promise<
  | { valid: true; coupon: Coupon; discount: number }
  | { valid: false; reason: CouponRejection; minOrderValue?: string; type?: string; value?: number }
> {
  const coupon = await getCouponByCode(code);
  if (!coupon) return { valid: false, reason: "not_found" };
  if (!coupon.active) return { valid: false, reason: "inactive" };
  const now = new Date();
  if (coupon.validFrom && coupon.validFrom > now) return { valid: false, reason: "not_started" };
  if (coupon.validUntil && coupon.validUntil < now) return { valid: false, reason: "expired" };
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, reason: "exhausted" };
  }
  if (coupon.minOrderValue != null && subtotal < Number(coupon.minOrderValue)) {
    // devolve type/value para o front "armar" o cupom (desconto ativa ao atingir o mínimo)
    return {
      valid: false,
      reason: "min_order",
      minOrderValue: String(coupon.minOrderValue),
      type: coupon.type,
      value: Number(coupon.value),
    };
  }
  const discount = computeDiscount(coupon.type, Number(coupon.value), subtotal);
  return { valid: true, coupon, discount };
}

export async function listOrders(page: number, limit: number) {
  const offset = (page - 1) * limit;
  const rows = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);
  const all = await db.select().from(orders);
  return { orders: rows, total: all.length };
}

export async function getOrderById(id: number) {
  const rows = await db.select().from(orders).where(eq(orders.id, id));
  const order = rows[0];
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  return { ...order, items };
}

// --- store settings (singleton, sempre id=1) ---

export async function getStoreSettings() {
  const rows = await db.select().from(storeSettings).where(eq(storeSettings.id, 1));
  return rows[0] ?? null;
}

export async function upsertStoreSettings(data: Partial<typeof storeSettings.$inferInsert>) {
  const existing = await getStoreSettings();
  if (!existing) {
    const rows = await db
      .insert(storeSettings)
      .values({ id: 1, ...data, updatedAt: new Date() })
      .returning();
    return rows[0];
  }
  const rows = await db
    .update(storeSettings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(storeSettings.id, 1))
    .returning();
  return rows[0];
}

// --- relatórios / indicadores ---

export async function getReportsSummary(startDate: Date) {
  const result = await db.execute(sql`
    select
      coalesce(sum(total::numeric), 0) as revenue,
      count(*) as orders_count
    from orders
    where status != 'cancelado' and created_at >= ${startDate}
  `);
  const row = result.rows[0] as { revenue: string; orders_count: string };
  const revenue = Number(row.revenue);
  const ordersCount = Number(row.orders_count);
  return {
    revenue,
    ordersCount,
    avgTicket: ordersCount > 0 ? revenue / ordersCount : 0,
  };
}

export async function getMonthlyRevenue(months = 12) {
  const result = await db.execute(sql`
    select
      to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
      coalesce(sum(total::numeric), 0) as revenue
    from orders
    where status != 'cancelado'
      and created_at >= date_trunc('month', now()) - interval '${sql.raw(String(months - 1))} months'
    group by 1
    order by 1
  `);
  return (result.rows as { month: string; revenue: string }[]).map((r) => ({
    month: r.month,
    revenue: Number(r.revenue),
  }));
}

export async function getTopProducts(limit = 10) {
  const result = await db.execute(sql`
    select
      oi.product_slug,
      oi.product_name,
      sum(oi.total_price::numeric) as revenue,
      sum(oi.quantity) as units,
      max(p.cost_price::numeric) as cost_price
    from order_items oi
    join orders o on o.id = oi.order_id
    left join products p on p.slug = oi.product_slug
    where o.status != 'cancelado'
    group by oi.product_slug, oi.product_name
    order by revenue desc
    limit ${limit}
  `);
  return (
    result.rows as {
      product_slug: string;
      product_name: string;
      revenue: string;
      units: string;
      cost_price: string | null;
    }[]
  ).map((r) => {
    const revenue = Number(r.revenue);
    const units = Number(r.units);
    const usesMargin = r.cost_price != null;
    const profit = usesMargin ? revenue - Number(r.cost_price) * units : null;
    return {
      productSlug: r.product_slug,
      productName: r.product_name,
      revenue,
      units,
      usesMargin,
      profit,
    };
  });
}

export async function getTopCustomersByLtv(limit = 10) {
  const result = await db.execute(sql`
    select
      customer_phone,
      max(customer_name) as customer_name,
      sum(total::numeric) as ltv,
      count(*) as orders_count
    from orders
    where status != 'cancelado'
    group by customer_phone
    order by ltv desc
    limit ${limit}
  `);
  return (
    result.rows as {
      customer_phone: string;
      customer_name: string;
      ltv: string;
      orders_count: string;
    }[]
  ).map((r) => ({
    customerPhone: r.customer_phone,
    customerName: r.customer_name,
    ltv: Number(r.ltv),
    ordersCount: Number(r.orders_count),
  }));
}

export async function getAvgLtv(): Promise<number> {
  const result = await db.execute(sql`
    select avg(ltv) as avg_ltv from (
      select sum(total::numeric) as ltv
      from orders
      where status != 'cancelado'
      group by customer_phone
    ) t
  `);
  const row = result.rows[0] as { avg_ltv: string | null };
  return row.avg_ltv != null ? Number(row.avg_ltv) : 0;
}

// --- transações de pagamento (Asaas) ---

export async function createPaymentTransaction(data: typeof paymentTransactions.$inferInsert) {
  const rows = await db.insert(paymentTransactions).values(data).returning();
  return rows[0];
}

/**
 * Cria a transação se ainda não existir (dedup pelo gatewayPaymentId único).
 * Evita explosão de unique violation quando dois webhooks da mesma cobrança
 * de assinatura chegam concorrentes.
 */
export async function ensurePaymentTransaction(data: typeof paymentTransactions.$inferInsert) {
  const inserted = await db
    .insert(paymentTransactions)
    .values(data)
    .onConflictDoNothing({ target: paymentTransactions.gatewayPaymentId })
    .returning();
  if (inserted[0]) return inserted[0];
  return getTransactionByGatewayPaymentId(data.gatewayPaymentId);
}

/**
 * "Reivindica" atomicamente a transição para pago desta transação. Retorna true
 * só para a PRIMEIRA chamada — as demais (webhook + poller concorrentes) recebem
 * false e não repetem os efeitos colaterais (materializar pedido, auto-etiqueta).
 */
export async function claimPaidEffects(id: number): Promise<boolean> {
  const rows = await db
    .update(paymentTransactions)
    .set({ paidEffectsAt: new Date() })
    .where(and(eq(paymentTransactions.id, id), isNull(paymentTransactions.paidEffectsAt)))
    .returning({ id: paymentTransactions.id });
  return rows.length > 0;
}

export async function getTransactionByGatewayPaymentId(gatewayPaymentId: string) {
  const rows = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.gatewayPaymentId, gatewayPaymentId));
  return rows[0];
}

export async function getTransactionsByOrder(orderId: number) {
  return db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.orderId, orderId))
    .orderBy(desc(paymentTransactions.createdAt));
}

export async function updatePaymentTransaction(
  id: number,
  data: Partial<typeof paymentTransactions.$inferInsert>
) {
  const rows = await db
    .update(paymentTransactions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(paymentTransactions.id, id))
    .returning();
  return rows[0];
}

/** Transações ainda não finalizadas — alvo do poller de reconciliação. */
export async function listOpenTransactions(limit = 50) {
  return db
    .select()
    .from(paymentTransactions)
    .where(
      inArray(paymentTransactions.status, [
        "PENDING",
        "AWAITING_RISK_ANALYSIS",
        "REFUND_REQUESTED",
        "REFUND_IN_PROGRESS",
      ])
    )
    .orderBy(desc(paymentTransactions.createdAt))
    .limit(limit);
}

export async function listTransactionsAdmin(page: number, limit: number) {
  const offset = (page - 1) * limit;
  const rows = await db
    .select()
    .from(paymentTransactions)
    .orderBy(desc(paymentTransactions.createdAt))
    .limit(limit)
    .offset(offset);
  const all = await db.select({ id: paymentTransactions.id }).from(paymentTransactions);
  return { transactions: rows, total: all.length };
}

// --- eventos de webhook (idempotência) ---

/** Insere o evento; retorna null se já foi recebido antes (duplicata). */
export async function insertWebhookEvent(data: typeof webhookEvents.$inferInsert) {
  const rows = await db
    .insert(webhookEvents)
    .values(data)
    .onConflictDoNothing({ target: webhookEvents.eventId })
    .returning();
  return rows[0] ?? null;
}

export async function markWebhookEventProcessed(id: number, error?: string) {
  if (error) {
    // falha: conta a tentativa (poison events param de ser reprocessados após N)
    await db
      .update(webhookEvents)
      .set({ processedAt: null, error, attempts: sql`${webhookEvents.attempts} + 1` })
      .where(eq(webhookEvents.id, id));
  } else {
    await db
      .update(webhookEvents)
      .set({ processedAt: new Date(), error: null })
      .where(eq(webhookEvents.id, id));
  }
}

const MAX_WEBHOOK_ATTEMPTS = 8;

/** Eventos recebidos, ainda não processados e abaixo do teto de tentativas. */
export async function listUnprocessedWebhookEvents(limit = 50) {
  return db
    .select()
    .from(webhookEvents)
    .where(
      and(
        isNull(webhookEvents.processedAt),
        sql`${webhookEvents.attempts} < ${MAX_WEBHOOK_ATTEMPTS}`
      )
    )
    .orderBy(webhookEvents.createdAt)
    .limit(limit);
}

// --- assinaturas ---

export async function createSubscriptionRow(data: typeof subscriptions.$inferInsert) {
  const rows = await db.insert(subscriptions).values(data).returning();
  return rows[0];
}

export async function getSubscriptionByGatewayId(gatewaySubscriptionId: string) {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.gatewaySubscriptionId, gatewaySubscriptionId));
  return rows[0];
}

export async function updateSubscriptionRow(
  id: number,
  data: Partial<typeof subscriptions.$inferInsert>
) {
  const rows = await db
    .update(subscriptions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(subscriptions.id, id))
    .returning();
  return rows[0];
}

export async function listSubscriptionsAdmin() {
  return db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
}

// --- pagamento do pedido ---

export async function updateOrderPayment(
  orderId: number,
  data: Partial<
    Pick<
      typeof orders.$inferInsert,
      "paymentStatus" | "paidAt" | "status" | "trackingCode" | "labelUrl"
    >
  >
) {
  const rows = await db.update(orders).set(data).where(eq(orders.id, orderId)).returning();
  return rows[0];
}

export async function getOrderByNumber(orderNumber: string) {
  const rows = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
  return rows[0];
}

/** Atualiza frete e total do pedido (usado ao recomputar o frete no pagamento). */
export async function updateOrderTotals(orderId: number, shippingAmount: string, total: string) {
  await db
    .update(orders)
    .set({ shippingAmount, total })
    .where(eq(orders.id, orderId));
}
