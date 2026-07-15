// Receptor de webhooks do Asaas.
// Regras críticas (fila do Asaas):
//  1. Validar o header asaas-access-token (segredo compartilhado, constant-time).
//  2. Responder 200 SEMPRE que o evento for aceito — 15 falhas consecutivas
//     interrompem a fila do Asaas (retenção de 14 dias).
//  3. Entrega é at-least-once: dedup pelo eventId (evt_xxx) no banco.
import { Router } from "express";
import { isValidWebhookToken, parseWebhookEvent } from "../asaas/index";
import { getAsaasConfig, applyPaymentUpdate } from "../asaas-integration";
import { insertWebhookEvent, markWebhookEventProcessed } from "../storage";

export function webhooksRouter(): Router {
  const router = Router();
  const cfg = getAsaasConfig();

  router.post("/asaas", async (req, res) => {
    // 1. autenticação
    const token = req.headers["asaas-access-token"];
    if (!isValidWebhookToken(cfg, typeof token === "string" ? token : undefined)) {
      // 401 aqui é intencional: um terceiro não pode alimentar a fila.
      // (Se o token do painel divergir do .env a fila vai interromper — o
      // e-mail de alerta do Asaas denuncia a configuração errada.)
      return res.status(401).json({ error: "Token inválido" });
    }

    // 2. parse defensivo
    const event = parseWebhookEvent(req.body);
    if (!event) {
      // corpo malformado: aceita com 200 para não travar a fila, mas loga
      console.warn("[asaas webhook] corpo inesperado:", JSON.stringify(req.body).slice(0, 500));
      return res.status(200).json({ received: true, ignored: true });
    }

    // 3. idempotência — grava o evento. Distingue duplicata (onConflictDoNothing
    //    retorna null) de FALHA REAL de banco (throw): num erro real respondemos
    //    500 para o Asaas reentregar, em vez de perder o evento silenciosamente.
    let row;
    try {
      row = await insertWebhookEvent({
        source: "asaas",
        eventId: event.id,
        eventType: event.event,
        gatewayPaymentId: event.payment?.id ?? null,
        payload: event as unknown as Record<string, unknown>,
      });
    } catch (err) {
      console.error("[asaas webhook] falha ao persistir evento (reentregar):", err);
      return res.status(500).json({ error: "erro ao registrar evento" });
    }

    if (!row) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    // 4. responde ANTES do processamento pesado — a fila do Asaas só precisa
    //    do 200; o processamento continua e erros ficam gravados no evento.
    res.status(200).json({ received: true });

    try {
      if (event.payment) {
        await applyPaymentUpdate(cfg, event.payment);
      }
      await markWebhookEventProcessed(row.id);
    } catch (err) {
      console.error(`[asaas webhook] erro ao processar ${event.id} (${event.event}):`, err);
      await markWebhookEventProcessed(
        row.id,
        err instanceof Error ? err.message : String(err)
      ).catch(() => {});
    }
  });

  return router;
}
