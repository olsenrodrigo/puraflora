import { useMemo, useState } from "react";
import {
  Check,
  Download,
  Loader2,
  Minus,
  Plus,
  Printer,
  Truck,
} from "lucide-react";
import { getPackage, PRODUCTS } from "@/data/catalog";
import { brl, cn } from "@/lib/utils";

interface LabelResult {
  url?: string;
  tickets: {
    trackingCode: string;
    publicTracking?: string;
    volumes: { barcode: string }[];
  }[];
}

interface Recipient {
  name: string;
  document: string;
  zipcode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  phone: string;
  email: string;
}

const EMPTY_RECIPIENT: Recipient = {
  name: "",
  document: "",
  zipcode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  phone: "",
  email: "",
};

export default function Etiquetas() {
  // gerar por código
  const [code, setCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);

  // novo envio
  const [recipient, setRecipient] = useState<Recipient>(EMPTY_RECIPIENT);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [nfeKey, setNfeKey] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);

  const [result, setResult] = useState<LabelResult | null>(null);
  const [error, setError] = useState("");

  const items = useMemo(
    () => PRODUCTS.filter((p) => (qty[p.slug] || 0) > 0),
    [qty]
  );

  const setR = (k: keyof Recipient) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setRecipient((r) => ({ ...r, [k]: e.target.value }));

  const bump = (slug: string, d: number) =>
    setQty((q) => ({ ...q, [slug]: Math.max(0, (q[slug] || 0) + d) }));

  async function generateByCode() {
    const c = code.trim();
    if (!c) return;
    setCodeLoading(true);
    setError("");
    setResult(null);
    try {
      const isUuid = /^[0-9a-f-]{32,36}$/i.test(c);
      const res = await fetch("/api/shipping/label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isUuid ? { orderIds: [c] } : { trackingCodes: [c] }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao gerar etiqueta");
      setResult(data.label);
    } catch (e: any) {
      setError(e.message || "Falha ao gerar etiqueta");
    } finally {
      setCodeLoading(false);
    }
  }

  async function generateNew() {
    setError("");
    setResult(null);
    if (!recipient.name || recipient.zipcode.replace(/\D/g, "").length !== 8) {
      setError("Preencha ao menos o nome e um CEP válido do destinatário.");
      return;
    }
    if (items.length === 0) {
      setError("Selecione ao menos um produto.");
      return;
    }
    setOrderLoading(true);
    try {
      const body = {
        preferenceBy: "QUOTE_VALUE",
        nfeKey: nfeKey.trim() || undefined,
        recipient,
        items: items.map((p) => {
          const pk = getPackage(p.slug);
          const amount = qty[p.slug];
          return {
            description: p.i18n.pt.name,
            amount,
            unitPrice: p.price,
            totalPrice: p.price * amount,
            weight: pk.weightG / 1000,
            height: pk.heightCm,
            width: pk.widthCm,
            length: pk.lengthCm,
            sku: [p.slug],
          };
        }),
      };
      const res = await fetch("/api/shipping/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao gerar etiqueta");
      setResult(data.label);
    } catch (e: any) {
      setError(e.message || "Falha ao gerar etiqueta");
    } finally {
      setOrderLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-pf-cream pb-24 pt-24 md:pt-28">
      <div className="container-pf max-w-4xl">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-pf-green-700 text-pf-cream">
            <Truck size={22} />
          </span>
          <div>
            <h1 className="font-display text-3xl font-semibold text-pf-green-900">
              Etiquetas de envio
            </h1>
            <p className="text-pf-ink-soft">
              Gere e imprima a etiqueta de postagem em poucos cliques.
            </p>
          </div>
        </div>

        {/* Resultado (aparece no topo quando gerado) */}
        {result && result.tickets?.length > 0 && (
          <div className="mt-6 rounded-2xl border-2 border-pf-green-500 bg-pf-green-50 p-6">
            <div className="flex items-center gap-2 text-pf-green-700">
              <Check size={20} />
              <span className="font-display text-lg font-semibold">
                Etiqueta gerada!
              </span>
            </div>
            <div className="mt-2 text-sm text-pf-ink-soft">
              Rastreio:{" "}
              <b className="text-pf-green-900">
                {result.tickets[0].trackingCode}
              </b>
              {result.tickets[0].volumes?.[0] && (
                <>
                  {" "}
                  · Volume:{" "}
                  <b className="text-pf-green-900">
                    {result.tickets[0].volumes[0].barcode}
                  </b>
                </>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {result.url && (
                <>
                  <button
                    onClick={() => window.open(result.url, "_blank")}
                    className="inline-flex items-center gap-2 rounded-full bg-pf-green-700 px-6 py-3 text-sm font-semibold text-pf-cream transition-colors hover:bg-pf-green-600"
                  >
                    <Printer size={18} /> Imprimir etiqueta
                  </button>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-pf-green-700/30 px-6 py-3 text-sm font-semibold text-pf-green-700 transition-colors hover:bg-pf-green-900/5"
                  >
                    <Download size={18} /> Baixar PDF
                  </a>
                </>
              )}
              {result.tickets[0].publicTracking && (
                <a
                  href={result.tickets[0].publicTracking}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full px-4 py-3 text-sm font-medium text-pf-green-700 hover:underline"
                >
                  Ver rastreio →
                </a>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-pf-clay/40 bg-pf-clay/5 p-4 text-sm text-pf-clay">
            {error}
          </div>
        )}

        {/* A) Gerar por código */}
        <div className="mt-6 rounded-2xl border border-pf-green-900/8 bg-white p-6">
          <h2 className="font-display text-lg font-semibold text-pf-green-900">
            Já tem o pedido? Gere a etiqueta pelo código
          </h2>
          <p className="mt-1 text-sm text-pf-ink-soft">
            Informe o código de rastreio (ex.: SM…) ou o ID do pedido.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generateByCode()}
              placeholder="SM0820768005VGK"
              className="w-full rounded-xl border border-pf-green-900/12 bg-pf-cream/40 px-4 py-3 text-base outline-none focus:border-pf-green-400 focus:bg-white"
            />
            <button
              onClick={generateByCode}
              disabled={codeLoading || !code.trim()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-pf-green-700 px-6 py-3 text-sm font-semibold text-pf-cream transition-colors hover:bg-pf-green-600 disabled:opacity-50"
            >
              {codeLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Printer size={18} />
              )}
              Gerar etiqueta
            </button>
          </div>
        </div>

        {/* B) Novo envio */}
        <div className="mt-5 rounded-2xl border border-pf-green-900/8 bg-white p-6">
          <h2 className="font-display text-lg font-semibold text-pf-green-900">
            Novo envio
          </h2>
          <p className="mt-1 text-sm text-pf-ink-soft">
            Preencha o destinatário, escolha os produtos e gere a etiqueta.
          </p>

          {/* destinatário */}
          <div className="mt-4 grid gap-3 sm:grid-cols-6">
            <Field label="Nome do destinatário" className="sm:col-span-4" value={recipient.name} onChange={setR("name")} />
            <Field label="CPF/CNPJ" className="sm:col-span-2" value={recipient.document} onChange={setR("document")} />
            <Field label="CEP" className="sm:col-span-2" value={recipient.zipcode} onChange={setR("zipcode")} />
            <Field label="Endereço" className="sm:col-span-3" value={recipient.street} onChange={setR("street")} />
            <Field label="Número" className="sm:col-span-1" value={recipient.number} onChange={setR("number")} />
            <Field label="Bairro" className="sm:col-span-2" value={recipient.neighborhood} onChange={setR("neighborhood")} />
            <Field label="Complemento" className="sm:col-span-2" value={recipient.complement} onChange={setR("complement")} />
            <Field label="Telefone" className="sm:col-span-2" value={recipient.phone} onChange={setR("phone")} />
          </div>

          {/* produtos */}
          <div className="mt-5">
            <span className="text-xs font-semibold uppercase tracking-wide text-pf-ink-soft">
              Produtos
            </span>
            <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-pf-green-900/8 p-2">
              {PRODUCTS.map((p) => {
                const q = qty[p.slug] || 0;
                return (
                  <div
                    key={p.slug}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2 py-1.5",
                      q > 0 && "bg-pf-green-50"
                    )}
                  >
                    <img src={p.image} alt="" className="h-9 w-9 rounded object-contain" />
                    <span className="flex-1 truncate text-sm text-pf-ink">
                      {p.i18n.pt.name}
                    </span>
                    <span className="text-xs text-pf-ink-soft">{brl(p.price)}</span>
                    <div className="flex items-center rounded-full border border-pf-green-900/12">
                      <button onClick={() => bump(p.slug, -1)} className="flex h-7 w-7 items-center justify-center text-pf-ink-soft hover:text-pf-green-700" aria-label="-">
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-pf-green-900">{q}</span>
                      <button onClick={() => bump(p.slug, 1)} className="flex h-7 w-7 items-center justify-center text-pf-ink-soft hover:text-pf-green-700" aria-label="+">
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field
              label="Chave da NF-e (opcional — 44 dígitos)"
              value={nfeKey}
              onChange={(e) => setNfeKey(e.target.value)}
            />
            <button
              onClick={generateNew}
              disabled={orderLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-pf-green-700 px-6 py-3 text-sm font-semibold text-pf-cream transition-colors hover:bg-pf-green-600 disabled:opacity-50"
            >
              {orderLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Truck size={18} />
              )}
              Gerar pedido + etiqueta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-pf-ink-soft">
        {label}
      </span>
      <input
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-pf-green-900/12 bg-pf-cream/40 px-3.5 py-2.5 text-sm outline-none focus:border-pf-green-400 focus:bg-white"
      />
    </label>
  );
}
