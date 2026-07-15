import { eq, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  adminUsers,
  categories,
  products,
  orders,
  orderItems,
  storeSettings,
  type ProductRow,
} from "../shared/schema";

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

export async function createOrderWithItems(
  orderData: typeof orders.$inferInsert,
  items: Array<Omit<typeof orderItems.$inferInsert, "orderId">>
) {
  const rows = await db.insert(orders).values(orderData).returning();
  const order = rows[0];
  if (items.length) {
    await db.insert(orderItems).values(items.map((it) => ({ ...it, orderId: order.id })));
  }
  return order;
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
