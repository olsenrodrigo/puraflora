import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Eye } from "lucide-react";
import { useAdminFetch } from "@/context/AdminAuthContext";
import { brl } from "@/lib/utils";
import type { Order } from "../../../shared/schema";

export default function AdminOrders() {
  const adminFetch = useAdminFetch();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("/api/admin/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-pf-green-900">Pedidos</h1>

      {loading ? (
        <p className="mt-8 text-pf-ink-soft">Carregando...</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-pf-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-pf-cream-100 text-xs font-semibold uppercase tracking-wide text-pf-ink-soft">
              <tr>
                <th className="px-5 py-3">Pedido</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pf-border">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-pf-ink">{o.orderNumber}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-pf-ink">{o.customerName}</p>
                    <p className="text-xs text-pf-ink-soft">{o.customerPhone}</p>
                  </td>
                  <td className="px-5 py-3 font-semibold text-pf-green-700">{brl(Number(o.total))}</td>
                  <td className="px-5 py-3 text-pf-ink-soft">
                    {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/pedidos/${o.id}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-pf-border text-pf-ink-soft hover:bg-pf-cream-100"
                    >
                      <Eye size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-pf-ink-soft">
                    Nenhum pedido registrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
