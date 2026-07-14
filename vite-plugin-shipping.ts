// Plugin Vite que expõe a API de frete server-side (token SmartEnvios seguro).
// Roda no dev server e no preview. Para produção, o mesmo handler pode ser
// montado num Express/serverless (ver README).
import type { Plugin, ViteDevServer, PreviewServer } from "vite";
import { loadEnv } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  loadConfig,
  quoteFreight,
  priceQuotes,
  createOrder,
  generateLabel,
  track,
  type SmartEnviosConfig,
} from "./server/smartenvios/index";

function readJson(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function json(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function makeHandler(cfg: SmartEnviosConfig) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = (req.url || "").split("?")[0].replace(/\/$/, "");
    try {
      // Info pública para a UI (nunca expõe o token)
      if (req.method === "GET" && url === "/config") {
        return json(res, 200, {
          mock: cfg.mock,
          env: cfg.env,
          senderZip: cfg.sender.zipcode,
          freeShippingAbove: cfg.rules.freeShippingAbove,
          discountPercent: cfg.rules.discountPercent,
        });
      }

      // Cotação de frete
      if (req.method === "POST" && url === "/quote") {
        const body = await readJson(req);
        const zipTo = String(body.zipTo || "").replace(/\D/g, "");
        const subtotal = Number(body.subtotal || 0);
        const volumes = Array.isArray(body.volumes) ? body.volumes : [];
        if (zipTo.length !== 8) {
          return json(res, 400, { error: "CEP de destino inválido" });
        }
        if (!volumes.length) {
          return json(res, 400, { error: "Sem volumes para cotar" });
        }
        const services = await quoteFreight(cfg, {
          zipFrom: cfg.sender.zipcode,
          zipTo,
          volumes,
          totalPrice: subtotal,
          document: body.document,
        });
        const options = priceQuotes(cfg, services, subtotal);
        return json(res, 200, {
          mock: cfg.mock,
          currency: "BRL",
          freeShippingAbove: cfg.rules.freeShippingAbove,
          options,
          invalid: services.filter((s) => !s.isValid),
        });
      }

      // Criar pedido (NF-e/DC) + gerar etiqueta
      if (req.method === "POST" && url === "/order") {
        const body = await readJson(req);
        const order = await createOrder(cfg, body);
        let label = null;
        if (body.generateLabel !== false) {
          const idOrCode = order.orderId
            ? { orderIds: [order.orderId] }
            : order.trackingCode
              ? { trackingCodes: [order.trackingCode] }
              : {};
          label = await generateLabel(cfg, { ...idOrCode, type: "pdf" });
        }
        return json(res, 200, { mock: cfg.mock, order, label });
      }

      // Gerar etiqueta de um pedido existente (por código/id/chave NF-e)
      if (req.method === "POST" && url === "/label") {
        const body = await readJson(req);
        const label = await generateLabel(cfg, {
          orderIds: body.orderIds,
          trackingCodes: body.trackingCodes,
          nfeKeys: body.nfeKeys,
          type: body.type || "pdf",
          documentType: body.documentType,
        });
        return json(res, 200, { mock: cfg.mock, label });
      }

      // Rastreio
      if (req.method === "POST" && url === "/track") {
        const body = await readJson(req);
        const events = await track(cfg, String(body.trackingCode || ""));
        return json(res, 200, { mock: cfg.mock, events });
      }

      return json(res, 404, { error: "Rota de frete não encontrada" });
    } catch (err: any) {
      const status = err?.status && err.status >= 400 ? err.status : 500;
      return json(res, status, {
        error: err?.message || "Erro no serviço de frete",
        details: err?.body ?? undefined,
      });
    }
  };
}

export function shippingApiPlugin(): Plugin {
  let cfg: SmartEnviosConfig;

  const mount = (server: ViteDevServer | PreviewServer) => {
    const handler = makeHandler(cfg);
    server.middlewares.use("/api/shipping", (req, res, next) => {
      handler(req, res).catch(next);
    });
  };

  return {
    name: "puraflora-shipping-api",
    configResolved(resolved) {
      const env = { ...process.env, ...loadEnv(resolved.mode, process.cwd(), "") };
      cfg = loadConfig(env as NodeJS.ProcessEnv);
      if (cfg.mock) {
        // eslint-disable-next-line no-console
        console.log(
          "[frete] SmartEnvios em modo MOCK (defina SMARTENVIOS_TOKEN no .env para o modo real)"
        );
      } else {
        // eslint-disable-next-line no-console
        console.log(`[frete] SmartEnvios conectado (${cfg.env})`);
      }
    },
    configureServer: mount,
    configurePreviewServer: mount,
  };
}
