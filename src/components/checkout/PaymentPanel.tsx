import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  BarcodeIcon,
  Check,
  Copy,
  CreditCard,
  Loader2,
  QrCode,
} from "lucide-react";
import { brl, cn } from "@/lib/utils";

type Method = "PIX" | "BOLETO" | "CREDIT_CARD";

interface PixResult {
  encodedImage: string;
  payload: string;
  expirationDate?: string;
}
interface BoletoResult {
  bankSlipUrl?: string;
  identificationField?: string;
}
interface CheckoutResult {
  mock: boolean;
  paymentId: string;
  status: string;
  paymentStatus: string;
  invoiceUrl?: string;
  pix?: PixResult;
  boleto?: BoletoResult;
}

interface Props {
  orderNumber: string;
  total: number;
  customer: { name: string; phone: string; email: string };
  maxInstallments: number;
}

const METHOD_LABELS: Record<Method, string> = {
  PIX: "PIX",
  BOLETO: "Boleto",
  CREDIT_CARD: "Cartão",
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-pf-border px-4 py-2 text-sm font-semibold text-pf-ink-soft hover:bg-pf-cream-100"
    >
      {done ? <Check size={15} className="text-pf-green-600" /> : <Copy size={15} />}
      {done ? "Copiado!" : label}
    </button>
  );
}

export default function PaymentPanel({ orderNumber, total, customer, maxInstallments }: Props) {
  const [method, setMethod] = useState<Method>("PIX");
  const [cpf, setCpf] = useState("");
  const [card, setCard] = useState({
    holderName: "",
    number: "",
    expiryMonth: "",
    expiryYear: "",
    ccv: "",
  });
  const [installments, setInstallments] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [paid, setPaid] = useState(false);
  const pollRef = useRef<number | null>(null);

  // Polling do status enquanto aguarda pagamento (PIX/boleto)
  useEffect(() => {
    if (!result || paid || method === "CREDIT_CARD") return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/payments/status/${orderNumber}`);
        const data = await res.json();
        if (data.paymentStatus === "paid") {
          setPaid(true);
          if (pollRef.current) window.clearInterval(pollRef.current);
        }
      } catch {
        /* segue tentando */
      }
    };
    pollRef.current = window.setInterval(poll, 4000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [result, paid, method, orderNumber]);

  const submit = async () => {
    setError(null);
    const cpfDigits = cpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11 && cpfDigits.length !== 14) {
      setError("Informe um CPF ou CNPJ válido.");
      return;
    }
    if (method === "CREDIT_CARD") {
      if (!card.holderName || card.number.replace(/\D/g, "").length < 13 || !card.ccv) {
        setError("Preencha os dados do cartão.");
        return;
      }
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        orderNumber,
        billingType: method,
        cpfCnpj: cpfDigits,
      };
      if (method === "CREDIT_CARD") {
        body.installmentCount = installments;
        body.creditCard = {
          holderName: card.holderName,
          number: card.number.replace(/\D/g, ""),
          expiryMonth: card.expiryMonth.padStart(2, "0"),
          expiryYear: card.expiryYear.length === 2 ? `20${card.expiryYear}` : card.expiryYear,
          ccv: card.ccv,
        };
        body.creditCardHolderInfo = {
          name: customer.name,
          email: customer.email || "sememail@puraflora.com.br",
          cpfCnpj: cpfDigits,
          postalCode: "00000000",
          addressNumber: "0",
          phone: customer.phone.replace(/\D/g, ""),
        };
      }
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível gerar o pagamento.");
        return;
      }
      setResult(data);
      if (data.paymentStatus === "paid") setPaid(true);
    } catch {
      setError("Falha de conexão ao gerar o pagamento.");
    } finally {
      setLoading(false);
    }
  };

  if (paid) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-pf-green-500/40 bg-pf-green-50 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pf-green-100">
          <Check size={30} className="text-pf-green-600" />
        </div>
        <h3 className="font-display text-xl font-semibold text-pf-green-900">
          Pagamento confirmado! 🌿
        </h3>
        <p className="max-w-sm text-sm text-pf-ink-soft">
          Recebemos seu pagamento do pedido <b>{orderNumber}</b>. Já estamos preparando seu envio.
        </p>
        <Link
          href="/loja"
          className="rounded-full bg-pf-green-700 px-6 py-3 text-sm font-semibold text-pf-cream hover:bg-pf-green-600"
        >
          Continuar comprando
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-pf-green-900/8 bg-white p-6">
      <h3 className="font-display text-lg font-semibold text-pf-green-900">Pagamento</h3>
      <p className="mt-1 text-sm text-pf-ink-soft">
        Pedido <b>{orderNumber}</b> · Total <b>{brl(total)}</b>
      </p>

      {!result ? (
        <>
          {/* seletor de método */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            {(Object.keys(METHOD_LABELS) as Method[]).map((m) => {
              const Icon = m === "PIX" ? QrCode : m === "BOLETO" ? BarcodeIcon : CreditCard;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors",
                    method === m
                      ? "border-pf-green-500 bg-pf-green-50 text-pf-green-700"
                      : "border-pf-border text-pf-ink-soft hover:border-pf-green-300"
                  )}
                >
                  <Icon size={20} />
                  {METHOD_LABELS[m]}
                </button>
              );
            })}
          </div>

          {/* CPF/CNPJ */}
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-pf-ink-soft">
              CPF ou CNPJ do pagador
            </span>
            <input
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              className="w-full rounded-xl border border-pf-green-900/12 bg-pf-cream/40 px-3.5 py-2.5 text-sm text-pf-ink outline-none focus:border-pf-green-400 focus:bg-white"
            />
          </label>

          {/* cartão */}
          {method === "CREDIT_CARD" && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <CardField label="Nome no cartão" value={card.holderName} onChange={(v) => setCard((c) => ({ ...c, holderName: v }))} className="col-span-2" />
              <CardField label="Número do cartão" value={card.number} onChange={(v) => setCard((c) => ({ ...c, number: v }))} className="col-span-2" placeholder="0000 0000 0000 0000" />
              <CardField label="Mês (MM)" value={card.expiryMonth} onChange={(v) => setCard((c) => ({ ...c, expiryMonth: v }))} placeholder="12" />
              <CardField label="Ano (AAAA)" value={card.expiryYear} onChange={(v) => setCard((c) => ({ ...c, expiryYear: v }))} placeholder="2030" />
              <CardField label="CVV" value={card.ccv} onChange={(v) => setCard((c) => ({ ...c, ccv: v }))} placeholder="123" />
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-pf-ink-soft">
                  Parcelas
                </span>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  className="w-full rounded-xl border border-pf-green-900/12 bg-pf-cream/40 px-3.5 py-2.5 text-sm text-pf-ink outline-none focus:border-pf-green-400 focus:bg-white"
                >
                  {Array.from({ length: maxInstallments }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}x de {brl(total / n)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {error && <p className="mt-4 rounded-lg bg-pf-clay/10 px-3 py-2 text-sm text-pf-clay">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-pf-green-700 px-6 py-3.5 text-sm font-semibold text-pf-cream hover:bg-pf-green-600 disabled:opacity-60"
          >
            {loading ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
            {loading ? "Gerando pagamento..." : `Pagar ${brl(total)}`}
          </button>
        </>
      ) : (
        <div className="mt-5">
          {/* PIX */}
          {method === "PIX" && result.pix && (
            <div className="flex flex-col items-center gap-4 text-center">
              <img
                src={`data:image/png;base64,${result.pix.encodedImage}`}
                alt="QR Code PIX"
                className="h-52 w-52 rounded-xl border border-pf-border bg-white p-2"
              />
              <p className="text-sm text-pf-ink-soft">
                Escaneie o QR Code ou copie o código PIX abaixo.
              </p>
              <div className="w-full break-all rounded-xl bg-pf-cream-100 p-3 font-mono text-xs text-pf-ink-soft">
                {result.pix.payload}
              </div>
              <CopyButton text={result.pix.payload} label="Copiar código PIX" />
              <div className="mt-2 flex items-center gap-2 text-sm text-pf-green-700">
                <Loader2 size={15} className="animate-spin" /> Aguardando confirmação do pagamento...
              </div>
            </div>
          )}

          {/* BOLETO */}
          {method === "BOLETO" && result.boleto && (
            <div className="flex flex-col items-center gap-4 text-center">
              <BarcodeIcon size={48} className="text-pf-green-600" />
              <p className="text-sm text-pf-ink-soft">Boleto gerado. Pague pelo link ou pela linha digitável.</p>
              {result.boleto.identificationField && (
                <div className="w-full break-all rounded-xl bg-pf-cream-100 p-3 font-mono text-xs text-pf-ink-soft">
                  {result.boleto.identificationField}
                </div>
              )}
              <div className="flex flex-wrap justify-center gap-2">
                {result.boleto.identificationField && (
                  <CopyButton text={result.boleto.identificationField} label="Copiar linha digitável" />
                )}
                {result.boleto.bankSlipUrl && (
                  <a
                    href={result.boleto.bankSlipUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-pf-green-700 px-4 py-2 text-sm font-semibold text-pf-cream hover:bg-pf-green-600"
                  >
                    Abrir boleto (PDF)
                  </a>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-pf-green-700">
                <Loader2 size={15} className="animate-spin" /> Aguardando compensação do boleto...
              </div>
            </div>
          )}

          {/* Cartão pendente de análise */}
          {method === "CREDIT_CARD" && (
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 size={40} className="animate-spin text-pf-green-600" />
              <p className="text-sm text-pf-ink-soft">
                Processando o pagamento no cartão... Isso leva alguns segundos.
              </p>
            </div>
          )}

          {result.mock && (
            <p className="mt-5 rounded-lg bg-pf-gold-500/10 px-3 py-2 text-center text-xs text-pf-gold-600">
              Ambiente de simulação (mock) — nenhum pagamento real é processado.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CardField({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-pf-ink-soft">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-pf-green-900/12 bg-pf-cream/40 px-3.5 py-2.5 text-sm text-pf-ink outline-none focus:border-pf-green-400 focus:bg-white"
      />
    </label>
  );
}
