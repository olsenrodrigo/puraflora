import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAdminFetch } from "@/context/AdminAuthContext";
import { brl, cn } from "@/lib/utils";

type Period = "today" | "week" | "month" | "year";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
];

interface Summary {
  revenue: number;
  ordersCount: number;
  avgTicket: number;
}

interface TopProduct {
  productSlug: string;
  productName: string;
  revenue: number;
  units: number;
  usesMargin: boolean;
  profit: number | null;
}

interface LtvCustomer {
  customerPhone: string;
  customerName: string;
  ltv: number;
  ordersCount: number;
}

export default function AdminReports() {
  const adminFetch = useAdminFetch();
  const [period, setPeriod] = useState<Period>("month");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<{ month: string; revenue: number }[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [ltv, setLtv] = useState<{ avgLtv: number; topCustomers: LtvCustomer[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch(`/api/admin/reports/summary?period=${period}`)
      .then((r) => r.json())
      .then(setSummary);
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminFetch("/api/admin/reports/monthly-revenue").then((r) => r.json()),
      adminFetch("/api/admin/reports/top-products").then((r) => r.json()),
      adminFetch("/api/admin/reports/ltv").then((r) => r.json()),
    ])
      .then(([m, p, l]) => {
        setMonthly(m);
        setTopProducts(p);
        setLtv(l);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold text-pf-green-900">Relatórios</h1>
        <div className="flex gap-1 rounded-full border border-pf-border bg-white p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-semibold",
                period === p.value ? "bg-pf-green-700 text-pf-cream" : "text-pf-ink-soft"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Faturamento (período)" value={summary ? brl(summary.revenue) : "—"} />
        <KpiCard label="Pedidos (período)" value={summary ? String(summary.ordersCount) : "—"} />
        <KpiCard label="Ticket médio" value={summary ? brl(summary.avgTicket) : "—"} />
        <KpiCard label="LTV médio (geral)" value={ltv ? brl(ltv.avgLtv) : "—"} />
      </div>

      {loading ? (
        <p className="mt-8 text-pf-ink-soft">Carregando...</p>
      ) : (
        <>
          {/* faturamento mensal */}
          <section className="mt-8 rounded-2xl border border-pf-border bg-white p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-pf-green-900">
              Faturamento mensal (últimos 12 meses)
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="pfRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3f5242" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3f5242" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4de" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => brl(v)} width={90} />
                  <Tooltip formatter={(v) => brl(Number(v))} />
                  <Area type="monotone" dataKey="revenue" stroke="#3f5242" fill="url(#pfRevenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* produto mais rentável */}
          <section className="mt-6 rounded-2xl border border-pf-border bg-white p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-pf-green-900">
              Produtos mais rentáveis
            </h2>
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wide text-pf-ink-soft">
                <tr>
                  <th className="pb-2">Produto</th>
                  <th className="pb-2">Receita</th>
                  <th className="pb-2">Lucro</th>
                  <th className="pb-2">Unidades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pf-border">
                {topProducts.map((p) => (
                  <tr key={p.productSlug}>
                    <td className="py-2 text-pf-ink">{p.productName}</td>
                    <td className="py-2 font-semibold text-pf-green-700">{brl(p.revenue)}</td>
                    <td className="py-2 text-pf-ink-soft">
                      {p.usesMargin ? brl(p.profit ?? 0) : "— (sem custo cadastrado)"}
                    </td>
                    <td className="py-2 text-pf-ink-soft">{p.units}</td>
                  </tr>
                ))}
                {topProducts.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-pf-ink-soft">Sem pedidos ainda.</td></tr>
                )}
              </tbody>
            </table>
          </section>

          {/* LTV */}
          <section className="mt-6 rounded-2xl border border-pf-border bg-white p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-pf-green-900">
              Top clientes por LTV
            </h2>
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wide text-pf-ink-soft">
                <tr>
                  <th className="pb-2">Cliente</th>
                  <th className="pb-2">Telefone</th>
                  <th className="pb-2">LTV</th>
                  <th className="pb-2">Pedidos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pf-border">
                {(ltv?.topCustomers ?? []).map((c) => (
                  <tr key={c.customerPhone}>
                    <td className="py-2 text-pf-ink">{c.customerName}</td>
                    <td className="py-2 text-pf-ink-soft">{c.customerPhone}</td>
                    <td className="py-2 font-semibold text-pf-green-700">{brl(c.ltv)}</td>
                    <td className="py-2 text-pf-ink-soft">{c.ordersCount}</td>
                  </tr>
                ))}
                {(ltv?.topCustomers ?? []).length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-pf-ink-soft">Sem pedidos ainda.</td></tr>
                )}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-pf-border bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-pf-ink-soft">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-pf-green-900">{value}</p>
    </div>
  );
}
