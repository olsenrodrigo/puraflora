// Receptor de webhooks do Asaas e da ponte Chatwoot ↔ WhatsApp.
// Regras críticas (fila do Asaas):
//  1. Validar o header asaas-access-token (segredo compartilhado, constant-time).
//  2. Responder 200 SEMPRE que o evento for aceito — 15 falhas consecutivas
//     interrompem a fila do Asaas (retenção de 14 dias).
//  3. Entrega é at-least-once: dedup pelo eventId (evt_xxx) no banco.
// Ponte Chatwoot ↔ WhatsApp (env vars documentadas em server/chatwoot-bridge.ts):
//  - POST /chatwoot: mensagem do visitante no chat do site → WhatsApp do suporte.
//  - POST /evolution: reply do atendente no WhatsApp → conversa no Chatwoot.
//  Ambas exigem ?secret=BRIDGE_WEBHOOK_SECRET, respondem 200 cedo e nunca
//  propagam erro — a ponte cair não pode derrubar o site.
import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { isValidWebhookToken, parseWebhookEvent } from "../asaas/index";
import { getAsaasConfig, applyPaymentUpdate } from "../asaas-integration";
import {
  insertWebhookEvent,
  markWebhookEventProcessed,
  upsertBridgeMapping,
  findBridgeByWaMessageId,
} from "../storage";
import {
  getBridgeConfig,
  sendWhatsAppToSupport,
  postChatwootReply,
  parseChatwootIncoming,
  parseEvolutionReply,
} from "../chatwoot-bridge";

function isValidBridgeSecret(expected: string, given: unknown): boolean {
  if (typeof given !== "string" || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

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

  // ── Ponte Chatwoot ↔ WhatsApp ──────────────────────────────────────────────

  // Chatwoot → WhatsApp: visitante escreveu no chat do site.
  router.post("/chatwoot", async (req, res) => {
    const bridge = getBridgeConfig();
    if (!bridge) return res.status(200).json({ received: true, ignored: true });
    if (!isValidBridgeSecret(bridge.webhookSecret, req.query.secret)) {
      return res.status(401).json({ error: "Segredo inválido" });
    }

    const msg = parseChatwootIncoming(req.body);
    if (!msg || msg.inboxId !== bridge.chatwootInboxId) {
      return res.status(200).json({ received: true, ignored: true });
    }

    // idempotência — Chatwoot também reentrega em caso de timeout
    let row;
    try {
      row = await insertWebhookEvent({
        source: "chatwoot",
        eventId: `chatwoot:${msg.messageId}`,
        eventType: "message_created",
        payload: req.body as Record<string, unknown>,
      });
    } catch (err) {
      console.error("[bridge chatwoot] falha ao persistir evento:", err);
      return res.status(500).json({ error: "erro ao registrar evento" });
    }
    if (!row) return res.status(200).json({ received: true, duplicate: true });

    res.status(200).json({ received: true });

    try {
      const text = `💬 Site #${msg.conversationId} (${msg.senderName}):\n${msg.content}`;
      const waMessageId = await sendWhatsAppToSupport(bridge, text);
      await upsertBridgeMapping(msg.conversationId, waMessageId);
      await markWebhookEventProcessed(row.id);
    } catch (err) {
      console.error(`[bridge chatwoot] erro ao encaminhar conversa #${msg.conversationId}:`, err);
      await markWebhookEventProcessed(
        row.id,
        err instanceof Error ? err.message : String(err)
      ).catch(() => {});
    }
  });

  // WhatsApp → Chatwoot: atendente respondeu citando uma mensagem encaminhada.
  router.post("/evolution", async (req, res) => {
    const bridge = getBridgeConfig();
    if (!bridge) return res.status(200).json({ received: true, ignored: true });
    if (!isValidBridgeSecret(bridge.webhookSecret, req.query.secret)) {
      return res.status(401).json({ error: "Segredo inválido" });
    }

    const reply = parseEvolutionReply(req.body);
    if (!reply) return res.status(200).json({ received: true, ignored: true });

    let mapping;
    try {
      mapping = await findBridgeByWaMessageId(reply.quotedStanzaId);
    } catch (err) {
      console.error("[bridge evolution] falha ao consultar bridge:", err);
      return res.status(200).json({ received: true, ignored: true });
    }
    // Citou algo que não veio da ponte (ou não é a última da conversa): não é
    // resposta de suporte — ignora em silêncio, conforme combinado.
    if (!mapping) return res.status(200).json({ received: true, ignored: true });

    let row;
    try {
      row = await insertWebhookEvent({
        source: "evolution",
        eventId: `evolution:${reply.waMessageId}`,
        eventType: "messages.upsert",
        payload: req.body as Record<string, unknown>,
      });
    } catch (err) {
      console.error("[bridge evolution] falha ao persistir evento:", err);
      return res.status(500).json({ error: "erro ao registrar evento" });
    }
    if (!row) return res.status(200).json({ received: true, duplicate: true });

    res.status(200).json({ received: true });

    try {
      await postChatwootReply(bridge, mapping.chatwootConversationId, reply.text);
      await markWebhookEventProcessed(row.id);
    } catch (err) {
      console.error(
        `[bridge evolution] erro ao responder conversa #${mapping.chatwootConversationId}:`,
        err
      );
      await markWebhookEventProcessed(
        row.id,
        err instanceof Error ? err.message : String(err)
      ).catch(() => {});
    }
  });

  return router;
}
