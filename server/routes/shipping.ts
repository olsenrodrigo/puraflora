import { Router } from "express";
import {
  loadConfig,
  quoteFreight,
  priceQuotes,
  createOrder,
  generateLabel,
  track,
  type SmartEnviosConfig,
} from "../smartenvios/index";

export function shippingRouter(): Router {
  const router = Router();
  const cfg: SmartEnviosConfig = loadConfig(process.env as NodeJS.ProcessEnv);

  if (cfg.mock) {
    console.log("[frete] SmartEnvios em modo MOCK (defina SMARTENVIOS_TOKEN no .env para o modo real)");
  } else {
    console.log(`[frete] SmartEnvios conectado (${cfg.env})`);
  }

  router.get("/config", (_req, res) => {
    res.json({
      mock: cfg.mock,
      env: cfg.env,
      senderZip: cfg.sender.zipcode,
      freeShippingAbove: cfg.rules.freeShippingAbove,
      discountPercent: cfg.rules.discountPercent,
    });
  });

  router.post("/quote", async (req, res) => {
    try {
      const zipTo = String(req.body.zipTo || "").replace(/\D/g, "");
      const subtotal = Number(req.body.subtotal || 0);
      const volumes = Array.isArray(req.body.volumes) ? req.body.volumes : [];
      if (zipTo.length !== 8) {
        return res.status(400).json({ error: "CEP de destino inválido" });
      }
      if (!volumes.length) {
        return res.status(400).json({ error: "Sem volumes para cotar" });
      }
      const services = await quoteFreight(cfg, {
        zipFrom: cfg.sender.zipcode,
        zipTo,
        volumes,
        totalPrice: subtotal,
        document: req.body.document,
      });
      const options = priceQuotes(cfg, services, subtotal);
      return res.json({
        mock: cfg.mock,
        currency: "BRL",
        freeShippingAbove: cfg.rules.freeShippingAbove,
        options,
        invalid: services.filter((s) => !s.isValid),
      });
    } catch (err: any) {
      const status = err?.status >= 400 ? err.status : 500;
      return res.status(status).json({ error: err?.message || "Erro no serviço de frete" });
    }
  });

  router.post("/order", async (req, res) => {
    try {
      const order = await createOrder(cfg, req.body);
      let label = null;
      if (req.body.generateLabel !== false) {
        const idOrCode = order.orderId
          ? { orderIds: [order.orderId] }
          : order.trackingCode
            ? { trackingCodes: [order.trackingCode] }
            : {};
        label = await generateLabel(cfg, { ...idOrCode, type: "pdf" });
      }
      return res.json({ mock: cfg.mock, order, label });
    } catch (err: any) {
      const status = err?.status >= 400 ? err.status : 500;
      return res.status(status).json({ error: err?.message || "Erro ao criar pedido" });
    }
  });

  router.post("/label", async (req, res) => {
    try {
      const label = await generateLabel(cfg, {
        orderIds: req.body.orderIds,
        trackingCodes: req.body.trackingCodes,
        nfeKeys: req.body.nfeKeys,
        type: req.body.type || "pdf",
        documentType: req.body.documentType,
      });
      return res.json({ mock: cfg.mock, label });
    } catch (err: any) {
      const status = err?.status >= 400 ? err.status : 500;
      return res.status(status).json({ error: err?.message || "Erro ao gerar etiqueta" });
    }
  });

  router.post("/track", async (req, res) => {
    try {
      const events = await track(cfg, String(req.body.trackingCode || ""));
      return res.json({ mock: cfg.mock, events });
    } catch (err: any) {
      const status = err?.status >= 400 ? err.status : 500;
      return res.status(status).json({ error: err?.message || "Erro ao rastrear" });
    }
  });

  return router;
}
