import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"), // "admin" | "financeiro" | "operacao"
  active: boolean("active").notNull().default(true),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: text("id").primaryKey(), // ex: "imunidade" — mesmo id usado no catalog.ts
  name: jsonb("name").$type<Record<string, string>>().notNull(), // {pt, en}
  blurb: jsonb("blurb").$type<Record<string, string>>().notNull(), // {pt, en}
  icon: text("icon").notNull(),
  accent: text("accent").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export interface ProductText {
  name: string;
  tagline: string;
  size: string;
  description: string;
  highlights: string[];
  composition: string[];
  usage: string;
  indication: string;
}

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  image: text("image").notNull(),
  categoryId: text("category_id").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: numeric("compare_at_price", { precision: 10, scale: 2 }),
  rating: numeric("rating", { precision: 2, scale: 1 }).notNull().default("4.8"),
  reviews: integer("reviews").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  badge: text("badge"), // "bestSeller" | "new" | null
  heroOrder: integer("hero_order"), // presença = aparece no hero
  heroAccent: text("hero_accent"),
  weightG: integer("weight_g").notNull().default(300),
  lengthCm: numeric("length_cm", { precision: 6, scale: 1 }).notNull().default("11"),
  widthCm: numeric("width_cm", { precision: 6, scale: 1 }).notNull().default("6"),
  heightCm: numeric("height_cm", { precision: 6, scale: 1 }).notNull().default("6"),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }), // opcional — margem nos relatórios
  i18n: jsonb("i18n").$type<Record<string, ProductText>>().notNull(), // {pt: ProductText, en: ProductText}
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone").notNull(),
  shippingCep: text("shipping_cep").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  shippingNumber: text("shipping_number").notNull(),
  shippingComplement: text("shipping_complement"),
  shippingDistrict: text("shipping_district").notNull(),
  shippingCity: text("shipping_city").notNull(),
  shippingState: text("shipping_state").notNull(),
  notes: text("notes"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  shippingService: text("shipping_service"),
  shippingAmount: numeric("shipping_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("recebido"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productSlug: text("product_slug").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
});

export const storeSettings = pgTable("store_settings", {
  id: serial("id").primaryKey(), // linha única (singleton, sempre id=1)
  storeName: text("store_name").notNull().default("PuraFlora"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  contactWhatsapp: text("contact_whatsapp"),
  cnpj: text("cnpj"),
  address: text("address"),
  mercadoPagoToken: text("mercado_pago_token"), // secreto — nunca devolver ao cliente
  mercadoPagoPublicKey: text("mercado_pago_public_key"),
  pixKey: text("pix_key"),
  maxInstallments: integer("max_installments").notNull().default(12),
  freeInstallments: integer("free_installments").notNull().default(3),
  monthlyInterestRate: numeric("monthly_interest_rate", { precision: 5, scale: 4 })
    .notNull()
    .default("0.0199"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCategorySchema = createInsertSchema(categories);
export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});
export const insertStoreSettingsSchema = createInsertSchema(storeSettings).omit({
  id: true,
  updatedAt: true,
});
export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  passwordHash: true,
  createdAt: true,
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type StoreSettingsRow = typeof storeSettings.$inferSelect;
