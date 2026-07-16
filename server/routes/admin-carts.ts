import { Router, type Request } from "express";
import { requireRole } from "../auth";
import {
  listAbandonedCheckoutsAdmin,
  registerAbandonedContact,
  updateAbandonedStatus,
  getAbandonedById,
  getStoreSettings,
} from "../storage";

const DEFAULT_TEMPLATE =
  "Oi {nome}! 👋 Vi que você deixou alguns itens no carrinho:\n\n{itens}\n\nPosso te ajudar a finalizar? É só clicar aqui: {link}{cupom}";

/**
 * Normaliza um telefone BR para E.164 (só dígitos, com DDI 55). Retorna null se
 * não parecer um número BR válido (DDD + 8/9 dígitos).
 */
function normalizePhoneBR(raw: string): string | null {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2); // remove DDI p/ validar o nacional
  if (d.length < 10 || d.length > 11) return null; // DDD(2) + 8 ou 9 dígitos
  return "55" + d;
}

function baseUrl(req: Request): string {
  return process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
}

function brl(v: number): string {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

interface SnapItem {
  productSlug: string;
  productName: string;
  quantity: number;
  unitPrice: string;
}

export function adminCartsRouter(): Router {
  const router = Router();
  router.use(requireRole("admin", "operacao"));

  // Lista carrinhos abandonados (filtros: status, minAgeHours, maxAgeDays)
  router.get("/abandoned", async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const minAgeHours = req.query.minAgeHours ? Number(req.query.minAgeHours) : undefined;
    const maxAgeDays = req.query.maxAgeDays ? Number(req.query.maxAgeDays) : undefined;
    const rows = await listAbandonedCheckoutsAdmin({ status, minAgeHours, maxAgeDays });
    res.json(rows);
  });

  // Monta a mensagem de recuperação e devolve o link do WhatsApp. Re-checa o
  // status (não pode contatar carrinho já convertido) de forma atômica.
  router.post("/abandoned/:id/message", async (req, res) => {
    const id = Number(req.params.id);
    const couponCode = typeof req.body?.couponCode === "string" && req.body.couponCode.trim()
      ? req.body.couponCode.trim().toUpperCase()
      : null;

    // Valida ANTES de registrar o contato (não incrementa contactCount se o
    // envio for impossível). O registro atômico re-checa status logo depois.
    const row = await getAbandonedById(id);
    if (!row) return res.status(404).json({ error: "Carrinho não encontrado" });
    if (row.status === "converted") {
      return res.status(409).json({ error: "Carrinho já convertido" });
    }
    const customerPhone = normalizePhoneBR(row.customerPhone || "");
    if (!customerPhone) {
      return res.status(400).json({ error: "Carrinho sem telefone válido" });
    }

    const updated = await registerAbandonedContact(id, couponCode);
    if (!updated) {
      return res.status(409).json({ error: "Carrinho já convertido ou inexistente" });
    }

    const settings = await getStoreSettings();
    const items = (updated.itemsSnapshot as SnapItem[]) ?? [];
    const itensStr = items
      .map((i) => `• ${i.quantity}x ${i.productName} — ${brl(Number(i.unitPrice) * i.quantity)}`)
      .join("\n");

    const link =
      `${baseUrl(req)}/loja/carrinho?recover=${encodeURIComponent(updated.cartToken)}` +
      (couponCode ? `&cupom=${encodeURIComponent(couponCode)}` : "");

    const cupomStr = couponCode
      ? `\n\n🎁 Use o cupom *${couponCode}* e ganhe um desconto!`
      : "";

    const template = settings?.abandonedMessageTemplate?.trim() || DEFAULT_TEMPLATE;
    const message = template
      .replace(/{nome}/g, (updated.customerName || "").split(" ")[0] || "tudo bem?")
      .replace(/{itens}/g, itensStr)
      .replace(/{link}/g, link)
      .replace(/{cupom}/g, cupomStr);

    const waLink = `https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}`;
    res.json({ waLink, contactCount: updated.contactCount });
  });

  // Atualiza status manualmente (ex.: marcar como expirado/ignorado)
  router.patch("/abandoned/:id", async (req, res) => {
    const status = typeof req.body?.status === "string" ? req.body.status : null;
    if (!status || !["open", "contacted", "converted", "expired"].includes(status)) {
      return res.status(400).json({ error: "Status inválido" });
    }
    const row = await updateAbandonedStatus(Number(req.params.id), status);
    if (!row) return res.status(404).json({ error: "Não encontrado" });
    res.json(row);
  });

  return router;
}
