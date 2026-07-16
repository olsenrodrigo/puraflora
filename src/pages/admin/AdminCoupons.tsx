import { useEffect, useState } from "react";
import { Check, Link2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useAdminFetch } from "@/context/AdminAuthContext";
import { brl } from "@/lib/utils";
import type { Coupon } from "../../../shared/schema";

interface FormState {
  code: string;
  type: "percentage" | "fixed";
  value: string;
  minOrderValue: string;
  maxUses: string;
  validFrom: string;
  validUntil: string;
  active: boolean;
}

const EMPTY: FormState = {
  code: "",
  type: "percentage",
  value: "",
  minOrderValue: "",
  maxUses: "",
  validFrom: "",
  validUntil: "",
  active: true,
};

const dateInput = (iso: string | null) => (iso ? String(iso).slice(0, 10) : "");
const fmtDate = (iso: string | Date | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR") : "∞";

export default function AdminCoupons() {
  const adminFetch = useAdminFetch();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch("/api/admin/coupons");
    setCoupons(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = () => {
    setForm(EMPTY);
    setEditingId(null);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (c: Coupon) => {
    setForm({
      code: c.code,
      type: c.type as "percentage" | "fixed",
      value: String(c.value),
      minOrderValue: c.minOrderValue != null ? String(c.minOrderValue) : "",
      maxUses: c.maxUses != null ? String(c.maxUses) : "",
      validFrom: dateInput(c.validFrom as unknown as string),
      validUntil: dateInput(c.validUntil as unknown as string),
      active: c.active,
    });
    setEditingId(c.id);
    setError(null);
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      code: form.code,
      type: form.type,
      value: Number(form.value),
      minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : null,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      validFrom: form.validFrom || null,
      validUntil: form.validUntil || null,
      active: form.active,
    };
    const res = await adminFetch(
      editingId ? `/api/admin/coupons/${editingId}` : "/api/admin/coupons",
      { method: editingId ? "PUT" : "POST", body: JSON.stringify(payload) }
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Falha ao salvar cupom");
      return;
    }
    setShowForm(false);
    await load();
  };

  const toggleActive = async (c: Coupon) => {
    await adminFetch(`/api/admin/coupons/${c.id}`, {
      method: "PUT",
      body: JSON.stringify({ active: !c.active }),
    });
    await load();
  };

  const handleDelete = async (id: number) => {
    setConfirmingId(null);
    await adminFetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    await load();
  };

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/loja?cupom=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(url);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-pf-green-900">Cupons</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-full bg-pf-green-700 px-5 py-2.5 text-sm font-semibold text-pf-cream hover:bg-pf-green-600"
        >
          <Plus size={16} /> Novo cupom
        </button>
      </div>

      {error && !showForm && (
        <p className="mt-4 rounded-lg bg-pf-clay/10 px-4 py-3 text-sm text-pf-clay">{error}</p>
      )}

      {showForm && (
        <form onSubmit={submit} className="mt-6 rounded-2xl border border-pf-border bg-white p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-pf-green-900">
            {editingId ? "Editar cupom" : "Novo cupom"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Código</span>
              <input
                required
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="VERAO10"
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Tipo</span>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "percentage" | "fixed" }))}
                className="input"
              >
                <option value="percentage">Percentual (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">
                Valor {form.type === "percentage" ? "(%)" : "(R$)"}
              </span>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Pedido mínimo (R$)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.minOrderValue}
                onChange={(e) => setForm((f) => ({ ...f, minOrderValue: e.target.value }))}
                placeholder="sem mínimo"
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Limite de usos</span>
              <input
                type="number"
                min="1"
                value={form.maxUses}
                onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                placeholder="ilimitado"
                className="input"
              />
            </label>
            <div />
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Válido de</span>
              <input
                type="date"
                value={form.validFrom}
                onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Válido até</span>
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                className="input"
              />
            </label>
            <label className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              <span className="text-sm font-semibold text-pf-ink">Ativo</span>
            </label>
          </div>
          {error && <p className="mt-3 rounded-lg bg-pf-clay/10 px-3 py-2 text-sm text-pf-clay">{error}</p>}
          <div className="mt-5 flex gap-3">
            <button type="submit" className="rounded-full bg-pf-green-700 px-6 py-2.5 text-sm font-semibold text-pf-cream hover:bg-pf-green-600">
              Salvar
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-pf-border px-6 py-2.5 text-sm font-semibold text-pf-ink-soft hover:bg-pf-cream-100">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="mt-8 text-pf-ink-soft">Carregando...</p>
      ) : coupons.length === 0 ? (
        <p className="mt-8 text-pf-ink-soft">Nenhum cupom cadastrado.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-pf-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-pf-cream-100 text-xs font-semibold uppercase tracking-wide text-pf-ink-soft">
              <tr>
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Desconto</th>
                <th className="px-5 py-3">Mínimo</th>
                <th className="px-5 py-3">Validade</th>
                <th className="px-5 py-3">Usos</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pf-border">
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3 font-mono font-semibold text-pf-ink">{c.code}</td>
                  <td className="px-5 py-3 text-pf-ink">
                    {c.type === "percentage" ? `${Number(c.value)}%` : brl(Number(c.value))}
                  </td>
                  <td className="px-5 py-3 text-pf-ink-soft">
                    {c.minOrderValue != null ? brl(Number(c.minOrderValue)) : "—"}
                  </td>
                  <td className="px-5 py-3 text-pf-ink-soft">
                    {fmtDate(c.validUntil as unknown as string)}
                  </td>
                  <td className="px-5 py-3 text-pf-ink-soft">
                    {c.usedCount}/{c.maxUses != null ? c.maxUses : "∞"}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleActive(c)}
                      className={
                        c.active
                          ? "rounded-full bg-pf-green-100 px-2.5 py-1 text-xs font-semibold text-pf-green-700"
                          : "rounded-full bg-pf-cream-200 px-2.5 py-1 text-xs font-semibold text-pf-ink-soft"
                      }
                    >
                      {c.active ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    {confirmingId === c.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-medium text-pf-clay">Excluir?</span>
                        <button onClick={() => handleDelete(c.id)} className="flex h-9 w-9 items-center justify-center rounded-full bg-pf-clay text-white hover:bg-pf-clay/90" aria-label="Confirmar">
                          <Check size={15} />
                        </button>
                        <button onClick={() => setConfirmingId(null)} className="flex h-9 w-9 items-center justify-center rounded-full border border-pf-border text-pf-ink-soft hover:bg-pf-cream-100" aria-label="Cancelar">
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => copyLink(c.code)} title="Copiar link" className="flex h-9 w-9 items-center justify-center rounded-full border border-pf-border text-pf-ink-soft hover:bg-pf-cream-100">
                          {copied === c.code ? <Check size={15} className="text-pf-green-600" /> : <Link2 size={15} />}
                        </button>
                        <button onClick={() => openEdit(c)} className="flex h-9 w-9 items-center justify-center rounded-full border border-pf-border text-pf-ink-soft hover:bg-pf-cream-100">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setConfirmingId(c.id)} className="flex h-9 w-9 items-center justify-center rounded-full border border-pf-border text-pf-clay hover:bg-pf-clay/10">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
