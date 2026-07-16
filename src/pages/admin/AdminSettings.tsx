import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { useAdminFetch } from "@/context/AdminAuthContext";
import { cn } from "@/lib/utils";

interface SettingsState {
  storeName: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  cnpj: string;
  address: string;
  abandonedMessageTemplate: string;
  mercadoPagoPublicKey: string;
  pixKey: string;
  maxInstallments: string;
  freeInstallments: string;
  monthlyInterestRate: string;
  paymentConfig: {
    pix: { enabled: boolean };
    boleto: { enabled: boolean };
    credit_card: { enabled: boolean; mode: "embedded" | "redirect" };
  };
}

const EMPTY: SettingsState = {
  storeName: "PuraFlora",
  contactEmail: "",
  contactPhone: "",
  contactWhatsapp: "",
  cnpj: "",
  address: "",
  abandonedMessageTemplate: "",
  mercadoPagoPublicKey: "",
  pixKey: "",
  maxInstallments: "12",
  freeInstallments: "3",
  monthlyInterestRate: "0.0199",
  paymentConfig: {
    pix: { enabled: true },
    boleto: { enabled: true },
    credit_card: { enabled: true, mode: "embedded" },
  },
};

export default function AdminSettings() {
  const adminFetch = useAdminFetch();
  const search = useSearch();
  const initialTab = new URLSearchParams(search).get("tab") === "pagamento" ? "pagamento" : "loja";
  const [tab, setTab] = useState<"loja" | "pagamento">(initialTab);
  const [form, setForm] = useState<SettingsState>(EMPTY);
  const [hasToken, setHasToken] = useState(false);
  const [tokenHint, setTokenHint] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setForm({
          storeName: d.storeName ?? "PuraFlora",
          contactEmail: d.contactEmail ?? "",
          contactPhone: d.contactPhone ?? "",
          contactWhatsapp: d.contactWhatsapp ?? "",
          cnpj: d.cnpj ?? "",
          address: d.address ?? "",
          abandonedMessageTemplate: d.abandonedMessageTemplate ?? "",
          mercadoPagoPublicKey: d.mercadoPagoPublicKey ?? "",
          pixKey: d.pixKey ?? "",
          maxInstallments: String(d.maxInstallments ?? 12),
          freeInstallments: String(d.freeInstallments ?? 3),
          monthlyInterestRate: String(d.monthlyInterestRate ?? "0.0199"),
          paymentConfig: {
            pix: { enabled: d.paymentConfig?.pix?.enabled ?? true },
            boleto: { enabled: d.paymentConfig?.boleto?.enabled ?? true },
            credit_card: {
              enabled: d.paymentConfig?.credit_card?.enabled ?? true,
              mode: d.paymentConfig?.credit_card?.mode === "redirect" ? "redirect" : "embedded",
            },
          },
        });
        setHasToken(!!d.hasToken);
        setTokenHint(d.tokenHint ?? null);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    const payload: Record<string, unknown> = {
      storeName: form.storeName,
      contactEmail: form.contactEmail || null,
      contactPhone: form.contactPhone || null,
      contactWhatsapp: form.contactWhatsapp || null,
      cnpj: form.cnpj || null,
      address: form.address || null,
      abandonedMessageTemplate: form.abandonedMessageTemplate || null,
      mercadoPagoPublicKey: form.mercadoPagoPublicKey || null,
      pixKey: form.pixKey || null,
      maxInstallments: Number(form.maxInstallments),
      freeInstallments: Number(form.freeInstallments),
      monthlyInterestRate: form.monthlyInterestRate,
      paymentConfig: form.paymentConfig,
    };
    if (tokenInput) payload.mercadoPagoToken = tokenInput;

    const res = await adminFetch("/api/admin/settings", { method: "PUT", body: JSON.stringify(payload) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Falha ao salvar");
      return;
    }
    setHasToken(!!data.hasToken);
    setTokenHint(data.tokenHint ?? null);
    setTokenInput("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  };

  const setPay = (method: string, patch: any) =>
    setForm((f) => ({
      ...f,
      paymentConfig: { ...f.paymentConfig, [method]: { ...(f.paymentConfig as any)[method], ...patch } },
    }));

  if (loading) return <p className="text-pf-ink-soft">Carregando...</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-semibold text-pf-green-900">Configurações</h1>

      <div className="mt-4 flex gap-1 rounded-full border border-pf-border bg-white p-1 w-fit">
        {(["loja", "pagamento"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold capitalize",
              tab === t ? "bg-pf-green-700 text-pf-cream" : "text-pf-ink-soft"
            )}
          >
            {t === "loja" ? "Loja" : "Pagamento"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 rounded-2xl border border-pf-border bg-white p-6">
        {tab === "loja" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Nome da loja</span>
              <input value={form.storeName} onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))} className="input" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">E-mail de contato</span>
              <input type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} className="input" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Telefone</span>
              <input value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} className="input" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">WhatsApp</span>
              <input value={form.contactWhatsapp} onChange={(e) => setForm((f) => ({ ...f, contactWhatsapp: e.target.value }))} className="input" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">CNPJ</span>
              <input value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))} className="input" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Endereço</span>
              <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="input" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Mensagem de recuperação de carrinho</span>
              <textarea
                value={form.abandonedMessageTemplate}
                onChange={(e) => setForm((f) => ({ ...f, abandonedMessageTemplate: e.target.value }))}
                rows={4}
                className="input font-mono text-sm"
                placeholder={"Oi {nome}! 👋 Vi que você deixou itens no carrinho:\n\n{itens}\n\nPosso te ajudar a finalizar? {link}{cupom}"}
              />
              <span className="mt-1 block text-xs text-pf-ink-soft">
                Placeholders: <code>{"{nome}"}</code> <code>{"{itens}"}</code> <code>{"{link}"}</code> <code>{"{cupom}"}</code>. Em branco usa o texto padrão.
              </span>
            </label>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Formas de pagamento aceitas</span>
              <div className="space-y-2">
                {[
                  { key: "pix", label: "PIX", card: false },
                  { key: "boleto", label: "Boleto", card: false },
                  { key: "credit_card", label: "Cartão de crédito", card: true },
                ].map((row) => {
                  const c = (form.paymentConfig as any)[row.key];
                  return (
                    <div key={row.key} className="flex flex-wrap items-center gap-3 rounded-xl border border-pf-border p-3">
                      <label className="flex min-w-[150px] items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={c.enabled} onChange={(e) => setPay(row.key, { enabled: e.target.checked })} />
                        <span className="text-sm font-semibold text-pf-ink">{row.label}</span>
                      </label>
                      {row.card && (
                        <label className="flex items-center gap-2 text-sm text-pf-ink-soft">
                          Onde paga
                          <select value={c.mode} disabled={!c.enabled} onChange={(e) => setPay(row.key, { mode: e.target.value })}
                            className="rounded-lg border border-pf-border px-2 py-1 text-sm disabled:opacity-50">
                            <option value="embedded">Embutido (cartão no site)</option>
                            <option value="redirect">Redirect (página do Asaas)</option>
                          </select>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-pf-ink-soft">Processador: Asaas. PIX e boleto aparecem no site; o cartão pode ser embutido ou hospedado (redirect) no Asaas.</p>
            </div>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">
                Token de acesso Mercado Pago {hasToken && <span className="font-normal text-pf-ink-soft">(salvo: {tokenHint})</span>}
              </span>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder={hasToken ? "digite um novo valor para substituir" : "APP_USR-..."}
                className="input"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Chave pública Mercado Pago</span>
              <input value={form.mercadoPagoPublicKey} onChange={(e) => setForm((f) => ({ ...f, mercadoPagoPublicKey: e.target.value }))} className="input" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Chave PIX</span>
              <input value={form.pixKey} onChange={(e) => setForm((f) => ({ ...f, pixKey: e.target.value }))} className="input" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Parcelas máximas</span>
              <input type="number" min="1" max="24" value={form.maxInstallments} onChange={(e) => setForm((f) => ({ ...f, maxInstallments: e.target.value }))} className="input" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Parcelas sem juros</span>
              <input type="number" min="1" value={form.freeInstallments} onChange={(e) => setForm((f) => ({ ...f, freeInstallments: e.target.value }))} className="input" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Juros ao mês (ex: 0.0199 = 1,99%)</span>
              <input value={form.monthlyInterestRate} onChange={(e) => setForm((f) => ({ ...f, monthlyInterestRate: e.target.value }))} className="input" />
            </label>
            <p className="text-xs text-pf-ink-soft sm:col-span-2">
              Esta seção só guarda a configuração — o checkout do PuraFlora continua sendo finalizado pelo WhatsApp.
            </p>
          </div>
        )}

        {error && <p className="mt-4 rounded-lg bg-pf-clay/10 px-3 py-2 text-sm text-pf-clay">{error}</p>}
        {success && <p className="mt-4 rounded-lg bg-pf-green-100 px-3 py-2 text-sm text-pf-green-700">Salvo com sucesso.</p>}

        <button
          type="submit"
          disabled={saving}
          className="mt-5 rounded-full bg-pf-green-700 px-8 py-2.5 text-sm font-semibold text-pf-cream hover:bg-pf-green-600 disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
}
