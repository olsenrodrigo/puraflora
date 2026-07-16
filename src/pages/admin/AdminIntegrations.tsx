import { useEffect, useState } from "react";
import { Link } from "wouter";
import { BarChart3, Check, CreditCard, Info, Truck, Wallet } from "lucide-react";
import { useAdminFetch } from "@/context/AdminAuthContext";
import { brl, cn } from "@/lib/utils";

interface AnalyticsForm {
  ga4MeasurementId: string;
  metaPixelId: string;
  tiktokPixelId: string;
  requireConsent: boolean;
}
const EMPTY_ANALYTICS: AnalyticsForm = {
  ga4MeasurementId: "",
  metaPixelId: "",
  tiktokPixelId: "",
  requireConsent: true,
};

interface ShippingStatus {
  mock: boolean;
  env: string;
  senderZip: string;
  freeShippingAbove: number;
  discountPercent: number;
}

interface AsaasStatus {
  mock: boolean;
  env: string;
  webhookUrl: string | null;
  webhookConfigured: boolean;
  webhookInterrupted: boolean;
  autoLabel: boolean;
  reconcileMinutes: number;
}

export default function AdminIntegrations() {
  const adminFetch = useAdminFetch();
  const [shipping, setShipping] = useState<ShippingStatus | null>(null);
  const [asaas, setAsaas] = useState<AsaasStatus | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [hasPaymentToken, setHasPaymentToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsForm>(EMPTY_ANALYTICS);
  const [analyticsSaving, setAnalyticsSaving] = useState(false);
  const [analyticsSaved, setAnalyticsSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/shipping/config").then((r) => r.json()),
      adminFetch("/api/admin/settings").then((r) => r.json()),
      adminFetch("/api/admin/payments/status").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([shippingData, settingsData, asaasData]) => {
        setShipping(shippingData);
        setHasPaymentToken(!!settingsData.hasToken);
        setAsaas(asaasData);
        const ac = settingsData.analyticsConfig ?? {};
        setAnalytics({
          ga4MeasurementId: ac.ga4MeasurementId ?? "",
          metaPixelId: ac.metaPixelId ?? "",
          tiktokPixelId: ac.tiktokPixelId ?? "",
          requireConsent: ac.requireConsent !== false,
        });
      })
      .finally(() => setLoading(false));
    adminFetch("/api/admin/payments/balance")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setBalance(d.balance))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveAnalytics = async () => {
    setAnalyticsSaving(true);
    setAnalyticsSaved(false);
    try {
      const res = await adminFetch("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          analyticsConfig: {
            ga4MeasurementId: analytics.ga4MeasurementId.trim(),
            metaPixelId: analytics.metaPixelId.trim(),
            tiktokPixelId: analytics.tiktokPixelId.trim(),
            requireConsent: analytics.requireConsent,
          },
        }),
      });
      if (res.ok) {
        setAnalyticsSaved(true);
        window.setTimeout(() => setAnalyticsSaved(false), 2500);
      }
    } finally {
      setAnalyticsSaving(false);
    }
  };

  if (loading) return <p className="text-pf-ink-soft">Carregando...</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-semibold text-pf-green-900">Integrações</h1>
      <p className="mt-2 text-sm text-pf-ink-soft">
        Status dos conectores do PuraFlora com serviços externos.
      </p>

      <div className="mt-6 space-y-4">
        {/* Analytics & Pixels */}
        <div className="rounded-2xl border border-pf-border bg-white p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pf-green-100 text-pf-green-700">
              <BarChart3 size={18} />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-pf-green-900">Analytics &amp; Pixels</h2>
              <p className="text-sm text-pf-ink-soft">Medição do funil — GA4, Meta Pixel e TikTok</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-pf-ink-soft">Google Analytics 4</span>
              <input
                value={analytics.ga4MeasurementId}
                onChange={(e) => setAnalytics((a) => ({ ...a, ga4MeasurementId: e.target.value }))}
                placeholder="G-XXXXXXXXXX"
                className="mt-1 w-full rounded-xl border border-pf-border px-3 py-2 font-mono text-sm focus:border-pf-green-700 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-pf-ink-soft">Meta Pixel</span>
              <input
                value={analytics.metaPixelId}
                onChange={(e) => setAnalytics((a) => ({ ...a, metaPixelId: e.target.value }))}
                placeholder="123456789012345"
                className="mt-1 w-full rounded-xl border border-pf-border px-3 py-2 font-mono text-sm focus:border-pf-green-700 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-pf-ink-soft">TikTok Pixel <span className="normal-case text-pf-ink-soft/70">(opcional)</span></span>
              <input
                value={analytics.tiktokPixelId}
                onChange={(e) => setAnalytics((a) => ({ ...a, tiktokPixelId: e.target.value }))}
                placeholder="CXXXXXXXXXXXXXXXXX"
                className="mt-1 w-full rounded-xl border border-pf-border px-3 py-2 font-mono text-sm focus:border-pf-green-700 focus:outline-none"
              />
            </label>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={analytics.requireConsent}
              onChange={(e) => setAnalytics((a) => ({ ...a, requireConsent: e.target.checked }))}
              className="mt-0.5 h-4 w-4 accent-pf-green-700"
            />
            <span className="text-sm text-pf-ink-soft">
              Exigir consentimento (LGPD) antes de carregar os pixels — recomendado. Sem isso, os pixels carregam para todos os visitantes.
            </span>
          </label>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={saveAnalytics}
              disabled={analyticsSaving}
              className="rounded-full bg-pf-green-700 px-5 py-2 text-sm font-semibold text-pf-cream hover:bg-pf-green-800 disabled:opacity-60"
            >
              {analyticsSaving ? "Salvando..." : "Salvar"}
            </button>
            {analyticsSaved && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-pf-green-700">
                <Check size={15} /> Salvo
              </span>
            )}
          </div>

          <p className="mt-4 flex items-start gap-2 rounded-xl bg-pf-cream-100 p-3 text-xs text-pf-ink-soft">
            <Info size={14} className="mt-0.5 shrink-0" />
            Só IDs públicos de pixel. Eventos rastreados: <code className="font-mono">view_item</code>, <code className="font-mono">add_to_cart</code>, <code className="font-mono">begin_checkout</code> e <code className="font-mono">purchase</code>.
          </p>
        </div>

        {/* SmartEnvios */}
        <div className="rounded-2xl border border-pf-border bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pf-green-100 text-pf-green-700">
                <Truck size={18} />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-pf-green-900">SmartEnvios</h2>
                <p className="text-sm text-pf-ink-soft">Cotação de frete e geração de etiquetas</p>
              </div>
            </div>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                shipping?.mock ? "bg-pf-gold-500/20 text-pf-gold-600" : "bg-pf-green-100 text-pf-green-700"
              )}
            >
              {shipping?.mock ? "Modo simulação" : "Conectado (produção)"}
            </span>
          </div>
          {shipping && (
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-pf-ink-soft">CEP remetente</dt>
                <dd className="text-pf-ink">{shipping.senderZip || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-pf-ink-soft">Frete grátis acima de</dt>
                <dd className="text-pf-ink">R$ {shipping.freeShippingAbove}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-pf-ink-soft">Desconto no frete</dt>
                <dd className="text-pf-ink">{shipping.discountPercent}%</dd>
              </div>
            </dl>
          )}
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-pf-cream-100 p-3 text-xs text-pf-ink-soft">
            <Info size={14} className="mt-0.5 shrink-0" />
            Este conector também está disponível como servidor MCP (
            <code className="font-mono">server/smartenvios/mcp.ts</code>) para uso por agentes de IA
            (Claude Desktop/Code) — recurso separado desta tela, que aqui só mostra o status da conexão.
          </p>
        </div>

        {/* Asaas — gateway ativo */}
        <div className="rounded-2xl border border-pf-border bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pf-green-100 text-pf-green-700">
                <Wallet size={18} />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-pf-green-900">Asaas</h2>
                <p className="text-sm text-pf-ink-soft">
                  Gateway de pagamento — PIX, boleto, cartão, assinaturas
                </p>
              </div>
            </div>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                asaas?.mock ? "bg-pf-gold-500/20 text-pf-gold-600" : "bg-pf-green-100 text-pf-green-700"
              )}
            >
              {asaas?.mock ? "Modo simulação" : `Conectado (${asaas?.env ?? "?"})`}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-pf-ink-soft">Saldo</dt>
              <dd className="text-pf-ink">{balance != null ? brl(balance) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-pf-ink-soft">Webhook</dt>
              <dd className={asaas?.webhookInterrupted ? "text-pf-clay" : "text-pf-ink"}>
                {asaas?.webhookInterrupted
                  ? "Interrompido"
                  : asaas?.webhookConfigured
                    ? "Ativo"
                    : "Não registrado"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-pf-ink-soft">Auto-etiqueta</dt>
              <dd className="text-pf-ink">{asaas?.autoLabel ? "Ligada" : "Desligada"}</dd>
            </div>
          </dl>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-pf-cream-100 p-3 text-xs text-pf-ink-soft">
            <Info size={14} className="mt-0.5 shrink-0" />
            Conector também disponível como servidor MCP (
            <code className="font-mono">server/asaas/mcp.ts</code>) para agentes de IA. A chave da
            API fica só no <code className="font-mono">.env</code>.
          </p>
        </div>

        {/* Mercado Pago — config-only (legado) */}
        <div className="rounded-2xl border border-pf-border bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pf-green-100 text-pf-green-700">
                <CreditCard size={18} />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-pf-green-900">Mercado Pago</h2>
                <p className="text-sm text-pf-ink-soft">Configuração guardada (gateway alternativo)</p>
              </div>
            </div>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                hasPaymentToken ? "bg-pf-green-100 text-pf-green-700" : "bg-pf-cream-200 text-pf-ink-soft"
              )}
            >
              {hasPaymentToken ? "Configurado" : "Não configurado"}
            </span>
          </div>
          <p className="mt-4 text-sm text-pf-ink-soft">
            Guarda as credenciais para uso futuro — o checkout do PuraFlora continua pelo WhatsApp.
          </p>
          <Link
            href="/admin/configuracoes?tab=pagamento"
            className="mt-4 inline-block rounded-full border border-pf-green-700/25 px-5 py-2 text-sm font-semibold text-pf-green-700 hover:bg-pf-green-700 hover:text-pf-cream"
          >
            Configurar
          </Link>
        </div>
      </div>
    </div>
  );
}
