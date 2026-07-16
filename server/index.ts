import "./env"; // precisa vir antes de qualquer import que leia process.env (ex: ./db)
import fs from "node:fs";
import path from "node:path";
import express from "express";
import { shippingRouter } from "./routes/shipping";
import { productsRouter } from "./routes/products";
import { cartsRouter } from "./routes/carts";
import { adminCartsRouter } from "./routes/admin-carts";
import { adminReviewsRouter } from "./routes/admin-reviews";
import { adminAuthRouter } from "./routes/admin-auth";
import { adminProductsRouter } from "./routes/admin-products";
import { ordersRouter } from "./routes/orders";
import { adminOrdersRouter } from "./routes/admin-orders";
import { adminCategoriesRouter } from "./routes/admin-categories";
import { adminUsersRouter } from "./routes/admin-users";
import { adminSettingsRouter } from "./routes/admin-settings";
import { adminReportsRouter } from "./routes/admin-reports";
import { paymentsRouter } from "./routes/payments";
import { webhooksRouter } from "./routes/webhooks";
import { adminPaymentsRouter } from "./routes/admin-payments";
import { couponsRouter } from "./routes/coupons";
import { adminCouponsRouter } from "./routes/admin-coupons";
import { getAsaasConfig, startReconciler } from "./asaas-integration";
import { hashPassword } from "./auth";
import { countAdmins, createAdminUser, purgeExpiredAbandoned } from "./storage";

async function seedDefaultAdmin() {
  try {
    const count = await countAdmins();
    if (count > 0) return;
    const email = process.env.ADMIN_EMAIL || "admin@puraflora.com.br";
    const password = process.env.ADMIN_PASSWORD || "PuraFlora@2026";
    await createAdminUser({
      name: "Administrador",
      email,
      passwordHash: hashPassword(password),
    });
    console.log(`[seed] admin padrão criado: ${email}`);
  } catch (err) {
    console.error("[seed] falha ao criar admin padrão:", err);
  }
}

async function main() {
  const app = express();
  // Um único proxy reverso na frente (nginx/VPS). Faz req.ip refletir o cliente
  // real sem aceitar X-Forwarded-For falsificado direto da internet.
  app.set("trust proxy", 1);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const uploadsDir = path.resolve(process.cwd(), "uploads/products");
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  app.use("/api/shipping", shippingRouter());
  app.use("/api/store", productsRouter());
  app.use("/api/carts", cartsRouter());
  app.use("/api/admin/carts", adminCartsRouter());
  app.use("/api/admin", adminAuthRouter());
  app.use("/api/admin/products", adminProductsRouter());
  app.use("/api/admin/orders", adminOrdersRouter());
  app.use("/api/admin/categories", adminCategoriesRouter());
  app.use("/api/admin/users", adminUsersRouter());
  app.use("/api/admin/settings", adminSettingsRouter());
  app.use("/api/admin/reports", adminReportsRouter());
  app.use("/api/admin/payments", adminPaymentsRouter());
  app.use("/api/admin/coupons", adminCouponsRouter());
  app.use("/api/admin/reviews", adminReviewsRouter());
  app.use("/api/payments", paymentsRouter());
  app.use("/api/webhooks", webhooksRouter());
  app.use("/api/orders", ordersRouter());
  app.use("/api/coupons", couponsRouter());

  await seedDefaultAdmin();

  // Expurgo LGPD dos carrinhos abandonados (retenção 30 dias): no boot + diário.
  const purgeAbandoned = () =>
    purgeExpiredAbandoned(30).catch((e) =>
      console.error("[carts] ALERTA: expurgo LGPD de carrinhos abandonados falhou:", e?.message)
    );
  purgeAbandoned();
  setInterval(purgeAbandoned, 24 * 60 * 60 * 1000).unref();
  startReconciler(getAsaasConfig());

  if (process.env.NODE_ENV === "production") {
    const { serveStatic } = await import("./static");
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(app);
  }

  const port = Number(process.env.PORT) || 3010;
  app.listen(port, () => {
    console.log(`[express] servindo na porta ${port}`);
  });
}

main();
