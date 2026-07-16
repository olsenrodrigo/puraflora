import { Router } from "express";
import { requireRole } from "../auth";
import { getStoreSettings, upsertStoreSettings } from "../storage";
import { insertStoreSettingsSchema, ANALYTICS_CONFIG_KEYS, type AnalyticsConfig } from "../../shared/schema";

// Aceita só as chaves conhecidas de analytics (IDs públicos de pixel + toggle
// de consentimento). Qualquer outra chave é descartada.
function sanitizeAnalytics(raw: unknown): AnalyticsConfig | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const src = raw as Record<string, unknown>;
  const out: AnalyticsConfig = {};
  for (const k of ANALYTICS_CONFIG_KEYS) {
    if (!(k in src)) continue;
    if (k === "requireConsent") out.requireConsent = src[k] !== false;
    else {
      const v = src[k];
      (out as Record<string, unknown>)[k] = typeof v === "string" ? v.trim() : "";
    }
  }
  return out;
}

// Nunca devolve o token do Mercado Pago em texto puro — só um indicador.
function toSafeResponse(settings: Record<string, any> | null) {
  const s = settings ?? {};
  const { mercadoPagoToken, ...rest } = s;
  return {
    ...rest,
    hasToken: !!mercadoPagoToken,
    tokenHint: mercadoPagoToken ? `•••• ${String(mercadoPagoToken).slice(-4)}` : null,
  };
}

export function adminSettingsRouter(): Router {
  const router = Router();
  router.use(requireRole("admin"));

  router.get("/", async (_req, res) => {
    const settings = await getStoreSettings();
    res.json(toSafeResponse(settings));
  });

  router.put("/", async (req, res) => {
    const { clearToken, ...body } = req.body || {};
    const parsed = insertStoreSettingsSchema.partial().safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    }
    const data = { ...parsed.data };
    // Um campo de token vazio no formulário não deve apagar o token já salvo —
    // só um pedido explícito de limpar (clearToken) ou um valor novo faz isso.
    if (!data.mercadoPagoToken) {
      delete data.mercadoPagoToken;
      if (clearToken) data.mercadoPagoToken = null as unknown as string;
    }
    // analyticsConfig: whitelist explícita das chaves (nunca aceitar campos crus).
    if ("analyticsConfig" in body) {
      data.analyticsConfig = sanitizeAnalytics(body.analyticsConfig) as never;
    }
    const settings = await upsertStoreSettings(data);
    res.json(toSafeResponse(settings));
  });

  return router;
}
