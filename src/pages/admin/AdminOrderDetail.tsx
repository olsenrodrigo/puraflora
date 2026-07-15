import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Check, Link2, RefreshCcw, Truck, X } from "lucide-react";
import { useAdminFetch } from "@/context/AdminAuthContext";
import { brl, cn } from "@/lib/utils";
import type { Order, OrderItemRow, PaymentTransaction } from "../../../shared/schema";

const PAYMENT_BADGES: Record<string, { label: string; cls: string }> = {
  paid: { label: "Pago", cls: "bg-pf-green-100 text-pf-green-700" },
  pending: { label: "Aguardando", cls: "bg-pf-gold-500/15 text-pf-gold-600" },
  overdue: { label: "Vencido", cls: "bg-pf-clay/10 text-pf-clay" },
  refunded: { label: "Estornado", cls: "bg-pf-cream-200 text-pf-ink-soft" },
  partially_refunded: { label: "Estorno parcial", cls: "bg-pf-cream-200 text-pf-ink-soft" },
  chargeback: { label: "Chargeback", cls: "bg-pf-clay/10 text-pf-clay" },
  cancelled: { label: "Cancelado", cls: "bg-pf-cream-200 text-pf-ink-soft" },
};

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const adminFetch = useAdminFetch();
  const [order, setOrder] = useState<(Order & { items: OrderItemRow[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [txs, setTxs] = useState<PaymentTransaction[]>([]);
  const [confirmRefund, setConfirmRefund] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = () => {
    adminFetch(`/api/admin/orders/${id}`)
      .then((r) => r.json())
      .then(setOrder)
      .finally(() => setLoading(false));
    adminFetch(`/api/admin/payments/order/${id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setTxs)
      .catch(() => setTxs([]));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const doRefund = async (paymentId: string) => {
    setConfirmRefund(null);
    setBusy(true);
    setMsg(null);
    const res = await adminFetch("/api/admin/payments/refund", {
      method: "POST",
      body: JSON.stringify({ paymentId }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg(data.error || "Falha ao estornar");
    setMsg("Estorno solicitado.");
    reload();
  };

  const genLink = async () => {
    setBusy(true);
    setMsg(null);
    const res = await adminFetch("/api/admin/payments/payment-link", {
      method: "POST",
      body: JSON.stringify({ orderId: Number(id) }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg(data.error || "Falha ao gerar link");
    setPaymentLink(data.url);
  };

  if (loading) return <p className="text-pf-ink-soft">Carregando...</p>;
  if (!order) return <p className="text-pf-ink-soft">Pedido não encontrado.</p>;

  const badge = order.paymentStatus ? PAYMENT_BADGES[order.paymentStatus] : null;

  return (
    <div className="max-w-2xl">
      <Link href="/admin/pedidos" className="flex items-center gap-1.5 text-sm font-medium text-pf-green-700 hover:underline">
        <ArrowLeft size={15} /> Voltar aos pedidos
      </Link>
      <h1 className="mt-3 font-display text-2xl font-semibold text-pf-green-900">
        Pedido {order.orderNumber}
      </h1>
      <p className="mt-1 text-sm text-pf-ink-soft">
        {new Date(order.createdAt).toLocaleString("pt-BR")}
      </p>

      <section className="mt-6 rounded-2xl border border-pf-border bg-white p-6">
        <h2 className="mb-3 font-display text-lg font-semibold text-pf-green-900">Cliente</h2>
        <p className="text-sm text-pf-ink">{order.customerName}</p>
        <p className="text-sm text-pf-ink-soft">{order.customerPhone}</p>
        {order.customerEmail && <p className="text-sm text-pf-ink-soft">{order.customerEmail}</p>}
      </section>

      <section className="mt-6 rounded-2xl border border-pf-border bg-white p-6">
        <h2 className="mb-3 font-display text-lg font-semibold text-pf-green-900">Endereço de entrega</h2>
        <p className="text-sm text-pf-ink">
          {order.shippingAddress}, {order.shippingNumber}
          {order.shippingComplement ? ` — ${order.shippingComplement}` : ""}
        </p>
        <p className="text-sm text-pf-ink-soft">
          {order.shippingDistrict} · {order.shippingCity}/{order.shippingState} · CEP {order.shippingCep}
        </p>
        {order.notes && <p className="mt-2 text-sm text-pf-ink-soft">Obs.: {order.notes}</p>}
      </section>

      <section className="mt-6 rounded-2xl border border-pf-border bg-white p-6">
        <h2 className="mb-3 font-display text-lg font-semibold text-pf-green-900">Itens</h2>
        <div className="space-y-2">
          {order.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between text-sm">
              <span className="text-pf-ink">{it.quantity}x {it.productName}</span>
              <span className="font-semibold text-pf-green-700">{brl(Number(it.totalPrice))}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 border-t border-pf-border pt-4 text-sm">
          <div className="flex justify-between text-pf-ink-soft">
            <span>Subtotal</span><span>{brl(Number(order.subtotal))}</span>
          </div>
          <div className="flex justify-between text-pf-ink-soft">
            <span>Frete{order.shippingService ? ` (${order.shippingService})` : ""}</span>
            <span>{brl(Number(order.shippingAmount))}</span>
          </div>
          <div className="flex justify-between border-t border-pf-border pt-2 font-semibold text-pf-green-900">
            <span>Total</span><span>{brl(Number(order.total))}</span>
          </div>
        </div>
      </section>

      {/* Pagamento */}
      <section className="mt-6 rounded-2xl border border-pf-border bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-pf-green-900">Pagamento</h2>
          {badge ? (
            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", badge.cls)}>
              {badge.label}
            </span>
          ) : (
            <span className="rounded-full bg-pf-cream-200 px-3 py-1 text-xs font-semibold text-pf-ink-soft">
              Via WhatsApp
            </span>
          )}
        </div>

        {order.paidAt && (
          <p className="mt-2 text-sm text-pf-ink-soft">
            Pago em {new Date(order.paidAt).toLocaleString("pt-BR")}
          </p>
        )}

        {txs.length > 0 && (
          <div className="mt-4 space-y-2">
            {txs.map((t) => (
              <div key={t.id} className="rounded-xl border border-pf-border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-pf-ink">
                    {t.method === "PIX" ? "PIX" : t.method === "BOLETO" ? "Boleto" : "Cartão"}
                    {t.installmentCount && t.installmentCount > 1 ? ` (${t.installmentCount}x)` : ""}
                  </span>
                  <span className="font-mono text-xs text-pf-ink-soft">{t.status}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-pf-green-700">{brl(Number(t.value))}</span>
                  <div className="flex items-center gap-2">
                    {t.invoiceUrl && (
                      <a
                        href={t.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-pf-green-700 hover:underline"
                      >
                        Ver cobrança
                      </a>
                    )}
                    {["RECEIVED", "CONFIRMED"].includes(t.status) &&
                      (confirmRefund === t.gatewayPaymentId ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-pf-clay">Estornar?</span>
                          <button
                            onClick={() => doRefund(t.gatewayPaymentId)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-pf-clay text-white"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmRefund(null)}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-pf-border text-pf-ink-soft"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRefund(t.gatewayPaymentId)}
                          className="inline-flex items-center gap-1 rounded-full border border-pf-border px-2.5 py-1 text-xs font-semibold text-pf-clay hover:bg-pf-clay/10"
                        >
                          <RefreshCcw size={12} /> Estornar
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={genLink}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-pf-border px-4 py-2 text-sm font-semibold text-pf-ink-soft hover:bg-pf-cream-100 disabled:opacity-60"
          >
            <Link2 size={15} /> Gerar link de pagamento
          </button>
        </div>

        {paymentLink && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-pf-cream-100 p-3">
            <a
              href={paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 break-all font-mono text-xs text-pf-green-700 hover:underline"
            >
              {paymentLink}
            </a>
            <button
              onClick={() => navigator.clipboard.writeText(paymentLink)}
              className="shrink-0 rounded-full border border-pf-border px-3 py-1.5 text-xs font-semibold text-pf-ink-soft hover:bg-white"
            >
              Copiar
            </button>
          </div>
        )}

        {msg && <p className="mt-3 text-sm text-pf-green-700">{msg}</p>}
      </section>

      {/* Envio / rastreio */}
      {(order.trackingCode || order.labelUrl) && (
        <section className="mt-6 rounded-2xl border border-pf-border bg-white p-6">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-pf-green-900">
            <Truck size={18} /> Envio
          </h2>
          {order.trackingCode && (
            <p className="text-sm text-pf-ink">
              Rastreio: <span className="font-mono">{order.trackingCode}</span>
            </p>
          )}
          {order.labelUrl && (
            <a
              href={order.labelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-semibold text-pf-green-700 hover:underline"
            >
              Abrir etiqueta (PDF)
            </a>
          )}
        </section>
      )}
    </div>
  );
}
