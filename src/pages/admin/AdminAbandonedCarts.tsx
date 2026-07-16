import { useEffect, useState } from "react";
import { MessageCircle, RefreshCw } from "lucide-react";
import { useAdminFetch } from "@/context/AdminAuthContext";
import { brl } from "@/lib/utils";

interface Row {
  id: number;
  cartToken: string;
  customerName: string | null;
  customerPhone: string;
  customerEmail: string | null;
  itemsSnapshot: { productName: string; quantity: number; unitPrice: string }[];
  subtotal: string;
  couponCode: string | null;
  status: string;
  contactCount: number;
  lastSeenAt: string;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "Aberto", cls: "bg-pf-gold-500/15 text-pf-gold-600" },
  contacted: { label: "Contatado", cls: "bg-pf-green-100 text-pf-green-700" },
  converted: { label: "Convertido", cls: "bg-pf-green-600 text-white" },
  expired: { label: "Expirado", cls: "bg-pf-cream-200 text-pf-ink-soft" },
};

function ageLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "agora há pouco";
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

export default function AdminAbandonedCarts() {
  const adminFetch = useAdminFetch();
  const [rows, setRows] = useState<Row[]>([]);
  const [coupons, setCoupons] = useState<{ code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [minAgeHours, setMinAgeHours] = useState("1");
  const [selCoupon, setSelCoupon] = useState<Record<number, string>>({});

  const load = () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (minAgeHours) qs.set("minAgeHours", minAgeHours);
    qs.set("maxAgeDays", "30");
    adminFetch(`/api/admin/carts/abandoned?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    adminFetch("/api/admin/coupons")
      .then((r) => (r.ok ? r.json() : []))
      .then((cs: any[]) => setCoupons(cs.filter((c) => c.active).map((c) => ({ code: c.code }))))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, minAgeHours]);

  const sendWhatsApp = async (row: Row) => {
    const coupon = selCoupon[row.id] || null;
    const res = await adminFetch(`/api/admin/carts/abandoned/${row.id}/message`, {
      method: "POST",
      body: JSON.stringify({ couponCode: coupon }),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.waLink) window.open(d.waLink, "_blank");
      load();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-pf-green-900">Carrinhos abandonados</h1>
          <p className="mt-2 text-sm text-pf-ink-soft">
            Clientes que iniciaram o checkout e consentiram receber contato. Envie a recuperação por WhatsApp.
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-full border border-pf-border px-4 py-2 text-sm font-semibold text-pf-ink-soft hover:bg-pf-cream-100">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-pf-border px-3 py-2 text-sm">
          <option value="">Todos os status</option>
          <option value="open">Abertos</option>
          <option value="contacted">Contatados</option>
          <option value="converted">Convertidos</option>
        </select>
        <select value={minAgeHours} onChange={(e) => setMinAgeHours(e.target.value)} className="rounded-xl border border-pf-border px-3 py-2 text-sm">
          <option value="0">Qualquer idade</option>
          <option value="1">Abandonados há 1h+</option>
          <option value="6">6h+</option>
          <option value="24">1 dia+</option>
        </select>
      </div>

      {loading ? (
        <p className="mt-8 text-pf-ink-soft">Carregando...</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-pf-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-pf-cream-100 text-xs font-semibold uppercase tracking-wide text-pf-ink-soft">
              <tr>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Itens</th>
                <th className="px-5 py-3">Valor</th>
                <th className="px-5 py-3">Abandonado</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Recuperar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pf-border">
              {rows.map((r) => {
                const st = STATUS[r.status] ?? STATUS.open;
                const items = Array.isArray(r.itemsSnapshot) ? r.itemsSnapshot : [];
                return (
                  <tr key={r.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-pf-ink">{r.customerName || "—"}</p>
                      <p className="text-xs text-pf-ink-soft">{r.customerPhone}</p>
                    </td>
                    <td className="px-5 py-3 text-pf-ink-soft">
                      {items.reduce((s, i) => s + i.quantity, 0)} item(s)
                      <span className="block text-xs opacity-70">{items.map((i) => i.productName).join(", ").slice(0, 40)}</span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-pf-green-700">{brl(Number(r.subtotal))}</td>
                    <td className="px-5 py-3 text-pf-ink-soft">
                      {ageLabel(r.lastSeenAt)}
                      {r.contactCount > 0 && <span className="block text-xs opacity-70">{r.contactCount} contato(s)</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-5 py-3">
                      {r.status !== "converted" ? (
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={selCoupon[r.id] || ""}
                            onChange={(e) => setSelCoupon((s) => ({ ...s, [r.id]: e.target.value }))}
                            className="rounded-lg border border-pf-border px-2 py-1.5 text-xs"
                          >
                            <option value="">Sem cupom</option>
                            {coupons.map((c) => (
                              <option key={c.code} value={c.code}>{c.code}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => sendWhatsApp(r)}
                            className="flex items-center gap-1.5 rounded-full bg-pf-green-700 px-3 py-1.5 text-xs font-semibold text-pf-cream hover:bg-pf-green-800"
                          >
                            <MessageCircle size={13} /> WhatsApp
                          </button>
                        </div>
                      ) : (
                        <p className="text-right text-xs text-pf-ink-soft">Pedido feito ✓</p>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-pf-ink-soft">Nenhum carrinho abandonado no filtro.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
