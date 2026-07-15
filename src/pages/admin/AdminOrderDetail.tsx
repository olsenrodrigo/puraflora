import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useAdminFetch } from "@/context/AdminAuthContext";
import { brl } from "@/lib/utils";
import type { Order, OrderItemRow } from "../../../shared/schema";

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const adminFetch = useAdminFetch();
  const [order, setOrder] = useState<(Order & { items: OrderItemRow[] }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch(`/api/admin/orders/${id}`)
      .then((r) => r.json())
      .then(setOrder)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <p className="text-pf-ink-soft">Carregando...</p>;
  if (!order) return <p className="text-pf-ink-soft">Pedido não encontrado.</p>;

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
    </div>
  );
}
