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
  // Agregado denormalizado de avaliações reais (recalculado na moderação).
  rating: numeric("rating", { precision: 2, scale: 1 }).notNull().default("0"),
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
  couponCode: text("coupon_code"), // snapshot; o cupom pode ser apagado depois
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  shippingService: text("shipping_service"),
  shippingAmount: numeric("shipping_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(), // = max(0, subtotal - desconto) + frete
  status: text("status").notNull().default("recebido"),
  // Pagamento online (Asaas) — null = pedido fechado via WhatsApp, sem cobrança online
  paymentStatus: text("payment_status"), // pending|paid|overdue|refunded|partially_refunded|cancelled|chargeback
  paidAt: timestamp("paid_at"),
  subscriptionId: integer("subscription_id"), // pedido materializado por uma assinatura
  // Envio (preenchidos pela auto-etiqueta SmartEnvios ou manualmente)
  trackingCode: text("tracking_code"),
  labelUrl: text("label_url"),
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

// Cupons de desconto. Código sempre normalizado (trim + UPPERCASE) na escrita/leitura.
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  type: text("type").notNull().default("percentage"), // "percentage" | "fixed"
  value: numeric("value", { precision: 10, scale: 2 }).notNull(), // % (0<v<=100) ou R$ (>0)
  minOrderValue: numeric("min_order_value", { precision: 10, scale: 2 }), // sobre o SUBTOTAL; null = sem mínimo
  maxUses: integer("max_uses"), // null = ilimitado
  usedCount: integer("used_count").notNull().default(0),
  validFrom: timestamp("valid_from"), // null = já vale
  validUntil: timestamp("valid_until"), // null = não expira
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Config de formas de pagamento (roteamento por método) ───────────────────
export type PaymentMethodKey = "pix" | "boleto" | "credit_card";
export type PaymentGatewayId = "asaas" | "mercadopago";
export type PaymentCardMode = "embedded" | "redirect";
export interface PaymentMethodConfig {
  enabled: boolean;
  gateway?: PaymentGatewayId; // no PuraFlora o processador é o Asaas
  mode?: PaymentCardMode; // só cartão: embutido (Asaas direto) x redirect (Asaas hospedado)
}
export interface PaymentConfig {
  pix: PaymentMethodConfig;
  boleto: PaymentMethodConfig;
  credit_card: PaymentMethodConfig;
}
export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  pix: { enabled: true, gateway: "asaas" },
  boleto: { enabled: true, gateway: "asaas" },
  credit_card: { enabled: true, gateway: "asaas", mode: "embedded" },
};

// ─── Analytics & Pixels (medição de funil) ───────────────────────────────────
// Só IDs PÚBLICOS de pixel (podem ir ao front). Nunca guardar aqui tokens
// secretos (ex.: Meta Conversions API) — esses vão em coluna própria.
export interface AnalyticsConfig {
  ga4MeasurementId?: string; // G-XXXXXXX (Google Analytics 4)
  metaPixelId?: string; // Meta/Facebook Pixel
  tiktokPixelId?: string; // TikTok Pixel (opcional)
  requireConsent?: boolean; // LGPD: exigir consentimento antes de carregar (default true)
}
export const ANALYTICS_CONFIG_KEYS: (keyof AnalyticsConfig)[] = [
  "ga4MeasurementId",
  "metaPixelId",
  "tiktokPixelId",
  "requireConsent",
];

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
  paymentConfig: jsonb("payment_config").$type<PaymentConfig>(),
  analyticsConfig: jsonb("analytics_config").$type<AnalyticsConfig>(),
  // Mensagem de recuperação de carrinho (placeholders: {nome} {itens} {link} {cupom})
  abandonedMessageTemplate: text("abandoned_message_template"),
  pixKey: text("pix_key"),
  maxInstallments: integer("max_installments").notNull().default(12),
  freeInstallments: integer("free_installments").notNull().default(3),
  monthlyInterestRate: numeric("monthly_interest_rate", { precision: 5, scale: 4 })
    .notNull()
    .default("0.0199"),
  reviewsEnabled: boolean("reviews_enabled").notNull().default(true),
  reviewsRequireModeration: boolean("reviews_require_moderation").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Transações de pagamento online (gateway-agnóstico; nome espelha o whitelabel
// para facilitar o porte futuro). Piloto: gateway = "asaas".
export const paymentTransactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id"), // null para links/assinaturas sem pedido de origem
  gateway: text("gateway").notNull().default("asaas"),
  gatewayPaymentId: text("gateway_payment_id").notNull().unique(), // pay_xxx
  gatewayCustomerId: text("gateway_customer_id"), // cus_xxx
  method: text("method").notNull(), // PIX | BOLETO | CREDIT_CARD
  status: text("status").notNull().default("PENDING"), // espelho do status Asaas
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  netValue: numeric("net_value", { precision: 10, scale: 2 }),
  dueDate: text("due_date"), // YYYY-MM-DD
  invoiceUrl: text("invoice_url"),
  bankSlipUrl: text("bank_slip_url"),
  pixPayload: text("pix_payload"), // copia-e-cola
  pixExpiration: text("pix_expiration"),
  installmentCount: integer("installment_count"),
  // Marca (atômica) de que os efeitos da transição "para pago" — materializar
  // pedido de assinatura, auto-etiqueta — já foram aplicados. Garante que
  // webhook e poller concorrentes NÃO dupliquem os efeitos.
  paidEffectsAt: timestamp("paid_effects_at"),
  rawResponse: jsonb("raw_response"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Eventos de webhook recebidos — o eventId único garante idempotência
// (entrega do Asaas é at-least-once; duplicatas são ignoradas).
export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  source: text("source").notNull().default("asaas"),
  eventId: text("event_id").notNull().unique(), // evt_xxx
  eventType: text("event_type").notNull(), // PAYMENT_CONFIRMED etc.
  gatewayPaymentId: text("gateway_payment_id"),
  payload: jsonb("payload").notNull(),
  processedAt: timestamp("processed_at"),
  attempts: integer("attempts").notNull().default(0), // tentativas de processamento
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Assinaturas ("assine e economize") — espelho local da assinatura Asaas com
// snapshot dos itens/endereço para materializar pedidos a cada ciclo pago.
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  gatewaySubscriptionId: text("gateway_subscription_id").notNull().unique(), // sub_xxx
  gatewayCustomerId: text("gateway_customer_id").notNull(), // cus_xxx
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone").notNull(),
  customerCpfCnpj: text("customer_cpf_cnpj"),
  shippingCep: text("shipping_cep").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  shippingNumber: text("shipping_number").notNull(),
  shippingComplement: text("shipping_complement"),
  shippingDistrict: text("shipping_district").notNull(),
  shippingCity: text("shipping_city").notNull(),
  shippingState: text("shipping_state").notNull(),
  billingType: text("billing_type").notNull(), // PIX | BOLETO | CREDIT_CARD
  cycle: text("cycle").notNull().default("MONTHLY"),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  shippingAmount: numeric("shipping_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  shippingService: text("shipping_service"),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE | INACTIVE | CANCELLED
  itemsSnapshot: jsonb("items_snapshot").notNull(), // [{productSlug, productName, quantity, unitPrice, totalPrice}]
  nextDueDate: text("next_due_date"), // YYYY-MM-DD
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Checkouts abandonados — capturados no checkout quando há contato + consentimento
// (LGPD). Uma linha por cartToken; recuperação via link ?recover=<token>.
export const abandonedCheckouts = pgTable("abandoned_checkouts", {
  id: serial("id").primaryKey(),
  cartToken: text("cart_token").notNull().unique(), // uuid gerado no front
  customerName: text("customer_name"),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  itemsSnapshot: jsonb("items_snapshot").notNull(), // [{productSlug, productName, quantity, unitPrice}]
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  couponCode: text("coupon_code"),
  consentAt: timestamp("consent_at").notNull(), // LGPD: linha só existe com consentimento
  status: text("status").notNull().default("open"), // open | contacted | converted | expired
  contactCount: integer("contact_count").notNull().default(0),
  contactedAt: timestamp("contacted_at"),
  recoveryCouponCode: text("recovery_coupon_code"),
  recoveredOrderId: integer("recovered_order_id"),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Avaliações de produtos. O e-mail nunca é exibido publicamente (só p/ verificação).
export const productReviews = pgTable("product_reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  rating: integer("rating").notNull(), // 1..5
  authorName: text("author_name").notNull(),
  authorEmail: text("author_email"), // interno — nunca vai ao público
  title: text("title"),
  comment: text("comment"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  verifiedPurchase: boolean("verified_purchase").notNull().default(false),
  adminReply: text("admin_reply"),
  locale: text("locale").notNull().default("pt"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  moderatedAt: timestamp("moderated_at"),
  moderatedBy: text("moderated_by"),
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
export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  createdAt: true,
  usedCount: true, // nunca vem do cliente/admin
});

export type Coupon = typeof coupons.$inferSelect;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type WebhookEventRow = typeof webhookEvents.$inferSelect;
export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type AbandonedCheckoutRow = typeof abandonedCheckouts.$inferSelect;
export type ProductReviewRow = typeof productReviews.$inferSelect;

export type AdminUser = typeof adminUsers.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type StoreSettingsRow = typeof storeSettings.$inferSelect;
