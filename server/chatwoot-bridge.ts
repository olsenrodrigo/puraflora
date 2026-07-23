// Ponte Chatwoot ↔ WhatsApp: o visitante conversa na caixinha do site
// (Chatwoot); a mensagem é encaminhada ao WhatsApp do suporte (self-chat) via
// Evolution API; a resposta do atendente — feita CITANDO (reply) a mensagem
// encaminhada — volta para a conversa certa no Chatwoot.
//
// Variáveis de ambiente (todas obrigatórias para a ponte ligar; vazias = ponte
// desligada, sem afetar o resto do site — mesmo padrão dos demais módulos):
//   CHATWOOT_API_BASE_URL      ex.: https://chat.puraflora.com.br
//   CHATWOOT_ACCOUNT_ID        id numérico da conta no Chatwoot
//   CHATWOOT_INBOX_ID          id da caixa de entrada Website (filtra eventos)
//   CHATWOOT_API_ACCESS_TOKEN  Access Token de AGENTE (perfil → Access Token)
//   EVOLUTION_API_URL          ex.: http://localhost:8085 (mesma máquina)
//   EVOLUTION_API_KEY          AUTHENTICATION_API_KEY do Evolution API
//   EVOLUTION_INSTANCE         nome da instância conectada (puraflora-suporte)
//   WHATSAPP_SUPPORT_NUMBER    número do suporte (self-chat), só dígitos com DDI
//   BRIDGE_WEBHOOK_SECRET      segredo exigido como ?secret= nas URLs de webhook
//                              (Chatwoot e Evolution não assinam payloads)

export type BridgeConfig = {
  chatwootBaseUrl: string;
  chatwootAccountId: string;
  chatwootInboxId: number;
  chatwootToken: string;
  evolutionUrl: string;
  evolutionKey: string;
  evolutionInstance: string;
  supportNumber: string;
  webhookSecret: string;
};

export function getBridgeConfig(): BridgeConfig | null {
  const cfg = {
    chatwootBaseUrl: (process.env.CHATWOOT_API_BASE_URL || "").replace(/\/$/, ""),
    chatwootAccountId: process.env.CHATWOOT_ACCOUNT_ID || "",
    chatwootInboxId: Number(process.env.CHATWOOT_INBOX_ID || 0),
    chatwootToken: process.env.CHATWOOT_API_ACCESS_TOKEN || "",
    evolutionUrl: (process.env.EVOLUTION_API_URL || "").replace(/\/$/, ""),
    evolutionKey: process.env.EVOLUTION_API_KEY || "",
    evolutionInstance: process.env.EVOLUTION_INSTANCE || "",
    supportNumber: process.env.WHATSAPP_SUPPORT_NUMBER || "",
    webhookSecret: process.env.BRIDGE_WEBHOOK_SECRET || "",
  };
  const complete = Object.values(cfg).every((v) => (typeof v === "number" ? v > 0 : v !== ""));
  return complete ? cfg : null;
}

/** Envia texto ao WhatsApp do suporte; retorna o id da mensagem enviada. */
export async function sendWhatsAppToSupport(cfg: BridgeConfig, text: string): Promise<string> {
  const res = await fetch(`${cfg.evolutionUrl}/message/sendText/${cfg.evolutionInstance}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: cfg.evolutionKey },
    body: JSON.stringify({ number: cfg.supportNumber, text }),
  });
  if (!res.ok) {
    throw new Error(`Evolution sendText ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as { key?: { id?: string } };
  const id = data.key?.id;
  if (!id) throw new Error(`Evolution sendText sem key.id: ${JSON.stringify(data).slice(0, 300)}`);
  return id;
}

/** Posta a resposta do atendente na conversa do Chatwoot (message_type outgoing). */
export async function postChatwootReply(
  cfg: BridgeConfig,
  conversationId: number,
  content: string
): Promise<void> {
  const url = `${cfg.chatwootBaseUrl}/api/v1/accounts/${cfg.chatwootAccountId}/conversations/${conversationId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", api_access_token: cfg.chatwootToken },
    body: JSON.stringify({ content, message_type: "outgoing" }),
  });
  if (!res.ok) {
    throw new Error(`Chatwoot postMessage ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

// --- extração defensiva dos payloads de webhook ---

export type ChatwootIncoming = {
  messageId: number;
  conversationId: number; // display_id — é o id usado nos paths da API
  inboxId: number;
  senderName: string;
  content: string;
};

/** Extrai a mensagem de visitante de um webhook message_created; null = ignorar. */
export function parseChatwootIncoming(body: unknown): ChatwootIncoming | null {
  const b = body as Record<string, any> | null;
  if (!b || b.event !== "message_created") return null;
  if (b.message_type !== "incoming") return null; // só mensagem do cliente
  if (b.private) return null; // notas internas não vão pro WhatsApp
  const conversationId = Number(b.conversation?.display_id ?? b.conversation?.id);
  const messageId = Number(b.id);
  const inboxId = Number(b.inbox?.id ?? b.conversation?.inbox_id);
  const content = typeof b.content === "string" ? b.content.trim() : "";
  if (!conversationId || !messageId || !content) return null;
  return {
    messageId,
    conversationId,
    inboxId,
    senderName: (b.sender?.name || "").trim() || "visitante",
    content,
  };
}

export type EvolutionReply = {
  waMessageId: string; // id da mensagem do atendente (dedup)
  quotedStanzaId: string; // id da mensagem citada — correlaciona com a bridge
  text: string;
};

/** Extrai uma RESPOSTA (reply, fromMe) de um webhook messages.upsert; null = ignorar. */
export function parseEvolutionReply(body: unknown): EvolutionReply | null {
  const b = body as Record<string, any> | null;
  if (!b || b.event !== "messages.upsert") return null;
  const data = b.data;
  if (!data?.key?.fromMe || !data.key.id) return null; // só o que EU enviei
  const msg = data.message ?? {};
  // Reply de texto chega como extendedTextMessage com contextInfo.stanzaId
  // (formato observado no Evolution v2.3.7 / Baileys; validar no teste e2e).
  const ext = msg.extendedTextMessage;
  const quotedStanzaId: string | undefined =
    ext?.contextInfo?.stanzaId ?? data.contextInfo?.stanzaId;
  const text: string = (ext?.text ?? msg.conversation ?? "").trim();
  if (!quotedStanzaId || !text) return null; // sem citação = não é resposta de suporte
  return { waMessageId: String(data.key.id), quotedStanzaId: String(quotedStanzaId), text };
}
