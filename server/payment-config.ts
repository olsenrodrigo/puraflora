// Resolve a config efetiva de formas de pagamento no PuraFlora.
// Processador é sempre o Asaas (o MercadoPago aqui é só MCP). Define, por método:
// aceito on/off e — no cartão — o modo (embutido = Asaas cartão direto;
// redirect = checkout hospedado do Asaas). Sem config no banco → default.
import type { PaymentCardMode, PaymentConfig, PaymentMethodConfig } from "../shared/schema";

const coerceMode = (m: unknown, fb: PaymentCardMode): PaymentCardMode =>
  m === "embedded" || m === "redirect" ? m : fb;

function merge(raw: Partial<PaymentMethodConfig> | undefined, base: PaymentMethodConfig): PaymentMethodConfig {
  const out: PaymentMethodConfig = {
    enabled: typeof raw?.enabled === "boolean" ? raw.enabled : base.enabled,
    gateway: "asaas",
  };
  if (base.mode !== undefined || raw?.mode !== undefined) {
    out.mode = coerceMode(raw?.mode, base.mode ?? "embedded");
  }
  return out;
}

export function resolvePaymentConfig(
  settings?: { paymentConfig?: PaymentConfig | null } | null
): PaymentConfig {
  const base: PaymentConfig = {
    pix: { enabled: true, gateway: "asaas" },
    boleto: { enabled: true, gateway: "asaas" },
    credit_card: { enabled: true, gateway: "asaas", mode: "embedded" },
  };
  const cfg = settings?.paymentConfig;
  if (!cfg) return base;
  return {
    pix: merge(cfg.pix, base.pix),
    boleto: merge(cfg.boleto, base.boleto),
    credit_card: merge(cfg.credit_card, base.credit_card),
  };
}

/** Config do método a partir do billingType do Asaas (PIX/BOLETO/CREDIT_CARD). */
export function methodConfigFor(cfg: PaymentConfig, billingType: string): PaymentMethodConfig | undefined {
  if (billingType === "PIX") return cfg.pix;
  if (billingType === "BOLETO") return cfg.boleto;
  if (billingType === "CREDIT_CARD") return cfg.credit_card;
  return undefined;
}
