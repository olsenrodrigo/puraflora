import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { useAdminFetch } from "@/context/AdminAuthContext";
import { brl } from "@/lib/utils";
import type { SubscriptionRow } from "../../../shared/schema";

const CYCLE_LABELS: Record<string, string> = {
  WEEKLY: "Semanal",
  BIWEEKLY: "Quinzenal",
  MONTHLY: "Mensal",
  BIMONTHLY: "Bimestral",
  QUARTERLY: "Trimestral",
  SEMIANNUALLY: "Semestral",
  YEARLY: "Anual",
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Ativa", cls: "bg-pf-green-100 text-pf-green-700" },
  INACTIVE: { label: "Pausada", cls: "bg-pf-gold-500/15 text-pf-gold-600" },
  CANCELLED: { label: "Cancelada", cls: "bg-pf-cream-200 text-pf-ink-soft" },
};

export default function AdminSubscriptions() {
  const adminFetch = useAdminFetch();
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    adminFetch("/api/admin/payments/subscriptions")
      .then((r) => (r.ok ? r.json() : []))
      .then(setSubs)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancel = async (id: number) => {
    setConfirmingId(null);
    await adminFetch(`/api/admin/payments/subscriptions/${id}/cancel`, { method: "POST" });
    load();
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-pf-green-900">Assinaturas</h1>
      <p className="mt-2 text-sm text-pf-ink-soft">
        Clientes com reposição recorrente ("assine e economize").
      </p>

      {loading ? (
        <p className="mt-8 text-pf-ink-soft">Carregando...</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-pf-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-pf-cream-100 text-xs font-semibold uppercase tracking-wide text-pf-ink-soft">
              <tr>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Ciclo</th>
                <th className="px-5 py-3">Valor</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pf-border">
              {subs.map((s) => {
                const st = STATUS_LABELS[s.status] ?? STATUS_LABELS.ACTIVE;
                return (
                  <tr key={s.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-pf-ink">{s.customerName}</p>
                      <p className="text-xs text-pf-ink-soft">{s.customerPhone}</p>
                    </td>
                    <td className="px-5 py-3 text-pf-ink-soft">{CYCLE_LABELS[s.cycle] ?? s.cycle}</td>
                    <td className="px-5 py-3 font-semibold text-pf-green-700">{brl(Number(s.value))}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {s.status !== "CANCELLED" &&
                        (confirmingId === s.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-pf-clay">Cancelar?</span>
                            <button
                              onClick={() => cancel(s.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-pf-clay text-white"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setConfirmingId(null)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-pf-border text-pf-ink-soft"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmingId(s.id)}
                            className="rounded-full border border-pf-border px-3 py-1.5 text-xs font-semibold text-pf-clay hover:bg-pf-clay/10"
                          >
                            Cancelar
                          </button>
                        ))}
                    </td>
                  </tr>
                );
              })}
              {subs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-pf-ink-soft">
                    Nenhuma assinatura ainda.
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
