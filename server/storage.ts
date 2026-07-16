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
  abandonedCheckouts,
  productReviews,
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

// --- carrinhos abandonados ---

/**
 * Upsert por cartToken. Uma linha por token; reatualiza contato/itens/subtotal
 * e o lastSeenAt. Nunca cria linha sem consentAt (garantido pela rota). Não
 * rebaixa status já "converted".
 */
export async function upsertAbandonedCheckout(data: {
  cartToken: string;
  customerName?: string | null;
  customerPhone: string;
  customerEmail?: string | null;
  itemsSnapshot: unknown;
  subtotal: string;
  couponCode?: string | null;
  consentAt: Date;
}) {
  const rows = await db
    .insert(abandonedCheckouts)
    .values({
      cartToken: data.cartToken,
      customerName: data.customerName ?? null,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail ?? null,
      itemsSnapshot: data.itemsSnapshot as never,
      subtotal: data.subtotal,
      couponCode: data.couponCode ?? null,
      consentAt: data.consentAt,
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: abandonedCheckouts.cartToken,
      set: {
        customerName: data.customerName ?? null,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail ?? null,
        itemsSnapshot: data.itemsSnapshot as never,
        subtotal: data.subtotal,
        couponCode: data.couponCode ?? null,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      },
      // não sobrescreve carrinhos já convertidos
      setWhere: sql`${abandonedCheckouts.status} <> 'converted'`,
    })
    .returning();
  return rows[0];
}

export async function getAbandonedByToken(cartToken: string) {
  const rows = await db
    .select()
    .from(abandonedCheckouts)
    .where(eq(abandonedCheckouts.cartToken, cartToken));
  return rows[0];
}

export async function getAbandonedById(id: number) {
  const rows = await db.select().from(abandonedCheckouts).where(eq(abandonedCheckouts.id, id));
  return rows[0];
}

/**
 * Marca como convertido quando o pedido é criado a partir do carrinho.
 * Só converte se o telefone bater (evita converter o token de outra pessoa) e se
 * ainda não estava convertido (primeira conversão vence; não sobrescreve o orderId).
 * `phoneDigits` = telefone do PEDIDO já normalizado (só dígitos).
 */
export async function markAbandonedConverted(cartToken: string, orderId: number, phoneDigits: string) {
  await db
    .update(abandonedCheckouts)
    .set({ status: "converted", recoveredOrderId: orderId, updatedAt: new Date() })
    .where(
      and(
        eq(abandonedCheckouts.cartToken, cartToken),
        sql`${abandonedCheckouts.status} <> 'converted'`,
        sql`regexp_replace(${abandonedCheckouts.customerPhone}, '[^0-9]', '', 'g') = ${phoneDigits}`
      )
    );
}

export async function listAbandonedCheckoutsAdmin(opts: {
  status?: string;
  minAgeHours?: number;
  maxAgeDays?: number;
} = {}) {
  const conds = [] as unknown[];
  if (opts.status) conds.push(eq(abandonedCheckouts.status, opts.status));
  if (opts.minAgeHours && opts.minAgeHours > 0)
    conds.push(sql`${abandonedCheckouts.lastSeenAt} <= now() - (${opts.minAgeHours} * interval '1 hour')`);
  if (opts.maxAgeDays && opts.maxAgeDays > 0)
    conds.push(sql`${abandonedCheckouts.lastSeenAt} >= now() - (${opts.maxAgeDays} * interval '1 day')`);
  const where = conds.length ? and(...(conds as never[])) : undefined;
  return db
    .select()
    .from(abandonedCheckouts)
    .where(where as never)
    .orderBy(desc(abandonedCheckouts.lastSeenAt));
}

/**
 * Registra um contato de recuperação (só se ainda não convertido). Retorna a
 * linha atualizada, ou null se já estava convertido/inexistente. O guard no
 * WHERE evita mandar mensagem para um carrinho que acabou de virar pedido.
 */
export async function registerAbandonedContact(id: number, couponCode?: string | null) {
  const rows = await db
    .update(abandonedCheckouts)
    .set({
      status: "contacted",
      contactCount: sql`${abandonedCheckouts.contactCount} + 1`,
      contactedAt: new Date(),
      recoveryCouponCode: couponCode ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(abandonedCheckouts.id, id), sql`${abandonedCheckouts.status} <> 'converted'`))
    .returning();
  return rows[0] ?? null;
}

export async function updateAbandonedStatus(id: number, status: string) {
  // Nunca sai de "converted" — reverter para open/etc. anularia os guards de
  // concorrência (contato/upsert). Um carrinho convertido é estado final.
  const rows = await db
    .update(abandonedCheckouts)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(abandonedCheckouts.id, id), sql`${abandonedCheckouts.status} <> 'converted'`))
    .returning();
  return rows[0] ?? null;
}

/** Revogação LGPD: remove o carrinho abandonado pelo token (capability). */
export async function deleteAbandonedByToken(cartToken: string) {
  await db.delete(abandonedCheckouts).where(eq(abandonedCheckouts.cartToken, cartToken));
}

/** Expurgo LGPD: remove carrinhos abandonados mais antigos que N dias. */
export async function purgeExpiredAbandoned(days: number) {
  await db
    .delete(abandonedCheckouts)
    .where(sql`${abandonedCheckouts.lastSeenAt} < now() - (${days} * interval '1 day')`);
}

// --- avaliações de produtos ---

export async function createReview(data: typeof productReviews.$inferInsert) {
  const rows = await db.insert(productReviews).values(data).returning();
  return rows[0];
}

/** Reviews aprovadas de um produto (paginado). Nunca devolve authorEmail. */
export async function listApprovedReviews(productId: number, limit = 10, offset = 0) {
  return db
    .select({
      id: productReviews.id,
      rating: productReviews.rating,
      authorName: productReviews.authorName,
      title: productReviews.title,
      comment: productReviews.comment,
      verifiedPurchase: productReviews.verifiedPurchase,
      adminReply: productReviews.adminReply,
      createdAt: productReviews.createdAt,
    })
    .from(productReviews)
    .where(and(eq(productReviews.productId, productId), eq(productReviews.status, "approved")))
    .orderBy(desc(productReviews.createdAt))
    .limit(limit)
    .offset(offset);
}

/** Agregado (média, total e distribuição 1..5) das reviews aprovadas. */
export async function getReviewAggregate(productId: number) {
  const rows = await db
    .select({ rating: productReviews.rating })
    .from(productReviews)
    .where(and(eq(productReviews.productId, productId), eq(productReviews.status, "approved")));
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>;
  let sum = 0;
  for (const r of rows) {
    if (r.rating >= 1 && r.rating <= 5) distribution[r.rating] += 1;
    sum += r.rating;
  }
  const count = rows.length;
  return { count, average: count ? Math.round((sum / count) * 10) / 10 : 0, distribution };
}

export async function listReviewsAdmin(opts: { status?: string; limit?: number; offset?: number } = {}) {
  const where = opts.status ? eq(productReviews.status, opts.status) : undefined;
  return db
    .select()
    .from(productReviews)
    .where(where as never)
    .orderBy(desc(productReviews.createdAt))
    .limit(opts.limit ?? 100)
    .offset(opts.offset ?? 0);
}

export async function countPendingReviews() {
  const rows = await db
    .select({ n: sql<number>`count(*)` })
    .from(productReviews)
    .where(eq(productReviews.status, "pending"));
  return Number(rows[0]?.n ?? 0);
}

/** Recalcula o agregado denormalizado em products (dentro de uma transação). */
async function recalcProductRatingTx(trx: any, productId: number) {
  // Serializa moderações/edições concorrentes DO MESMO produto: quem chegar
  // primeiro trava a linha; o segundo espera e recalcula sobre o estado já commitado.
  await trx.execute(sql`SELECT id FROM ${products} WHERE ${products.id} = ${productId} FOR UPDATE`);
  const rows = await trx
    .select({ rating: productReviews.rating })
    .from(productReviews)
    .where(and(eq(productReviews.productId, productId), eq(productReviews.status, "approved")));
  const count = rows.length;
  const avg = count ? rows.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / count : 0;
  await trx
    .update(products)
    .set({ rating: avg.toFixed(1), reviews: count })
    .where(eq(products.id, productId));
}

/**
 * Modera uma review (aprovar/rejeitar + resposta) e recalcula o agregado do
 * produto na MESMA transação (consistência sob moderações concorrentes).
 */
export async function moderateReview(
  id: number,
  patch: { status: string; adminReply?: string | null },
  moderatedBy: string
) {
  return db.transaction(async (trx) => {
    const [updated] = await trx
      .update(productReviews)
      .set({
        status: patch.status,
        adminReply: patch.adminReply ?? undefined,
        moderatedAt: new Date(),
        moderatedBy,
      })
      .where(eq(productReviews.id, id))
      .returning();
    if (!updated) return null;
    await recalcProductRatingTx(trx, updated.productId);
    return updated;
  });
}

export async function recalcProductRating(productId: number) {
  return db.transaction((trx) => recalcProductRatingTx(trx, productId));
}

/** Cria uma review JÁ aprovada e recalcula o agregado na MESMA transação. */
export async function createReviewApproved(data: typeof productReviews.$inferInsert) {
  return db.transaction(async (trx) => {
    const [row] = await trx.insert(productReviews).values({ ...data, status: "approved" }).returning();
    await recalcProductRatingTx(trx, row.productId);
    return row;
  });
}

export async function deleteReview(id: number) {
  return db.transaction(async (trx) => {
    const [row] = await trx.delete(productReviews).where(eq(productReviews.id, id)).returning();
    if (row) await recalcProductRatingTx(trx, row.productId);
    return row ?? null;
  });
}

/** Confere se o e-mail comprou o produto naquele pedido (para verifiedPurchase). */
export async function verifyPurchase(orderNumber: string, email: string, productSlug: string): Promise<boolean> {
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.orderNumber, orderNumber),
        sql`lower(${orders.customerEmail}) = lower(${email})`,
        eq(orderItems.productSlug, productSlug)
      )
    )
    .limit(1);
  return rows.length > 0;
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
