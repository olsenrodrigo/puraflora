import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useAdminFetch } from "@/context/AdminAuthContext";
import { useProducts } from "@/context/ProductsContext";
import type { Category } from "../../../shared/schema";

const ICONS = ["shield", "sparkles", "flame", "leaf", "droplets", "heart"];

interface FormState {
  id: string;
  namePt: string;
  nameEn: string;
  blurbPt: string;
  blurbEn: string;
  icon: string;
  accent: string;
}

const EMPTY_FORM: FormState = {
  id: "",
  namePt: "",
  nameEn: "",
  blurbPt: "",
  blurbEn: "",
  icon: "leaf",
  accent: "#5f7261",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminCategories() {
  const adminFetch = useAdminFetch();
  const { refetch: refetchStorefront } = useProducts();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch("/api/admin/categories");
    setCategories(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    const name = cat.name as Record<string, string>;
    const blurb = cat.blurb as Record<string, string>;
    setForm({
      id: cat.id,
      namePt: name.pt ?? "",
      nameEn: name.en ?? "",
      blurbPt: blurb.pt ?? "",
      blurbEn: blurb.en ?? "",
      icon: cat.icon,
      accent: cat.accent,
    });
    setEditingId(cat.id);
    setError(null);
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      id: editingId ?? slugify(form.namePt),
      name: { pt: form.namePt, en: form.nameEn || form.namePt },
      blurb: { pt: form.blurbPt, en: form.blurbEn || form.blurbPt },
      icon: form.icon,
      accent: form.accent,
      sortOrder: categories.length,
      active: true,
    };
    const res = await adminFetch(
      editingId ? `/api/admin/categories/${editingId}` : "/api/admin/categories",
      { method: editingId ? "PUT" : "POST", body: JSON.stringify(payload) }
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Falha ao salvar categoria");
      return;
    }
    setShowForm(false);
    await load();
    refetchStorefront();
  };

  const toggleActive = async (cat: Category) => {
    await adminFetch(`/api/admin/categories/${cat.id}`, {
      method: "PUT",
      body: JSON.stringify({ active: !cat.active }),
    });
    await load();
    refetchStorefront();
  };

  const handleDelete = async (id: string) => {
    setConfirmingId(null);
    const res = await adminFetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Falha ao excluir categoria");
      return;
    }
    await load();
    refetchStorefront();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-pf-green-900">Categorias</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-full bg-pf-green-700 px-5 py-2.5 text-sm font-semibold text-pf-cream hover:bg-pf-green-600"
        >
          <Plus size={16} /> Nova categoria
        </button>
      </div>

      {error && !showForm && (
        <p className="mt-4 rounded-lg bg-pf-clay/10 px-4 py-3 text-sm text-pf-clay">{error}</p>
      )}

      {showForm && (
        <form onSubmit={submit} className="mt-6 rounded-2xl border border-pf-border bg-white p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-pf-green-900">
            {editingId ? "Editar categoria" : "Nova categoria"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Nome (PT)</span>
              <input required value={form.namePt} onChange={(e) => setForm((f) => ({ ...f, namePt: e.target.value }))} className="input" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Nome (EN)</span>
              <input value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} className="input" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Descrição (PT)</span>
              <input value={form.blurbPt} onChange={(e) => setForm((f) => ({ ...f, blurbPt: e.target.value }))} className="input" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Descrição (EN)</span>
              <input value={form.blurbEn} onChange={(e) => setForm((f) => ({ ...f, blurbEn: e.target.value }))} className="input" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Ícone</span>
              <select value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} className="input">
                {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Cor de destaque</span>
              <input type="color" value={form.accent} onChange={(e) => setForm((f) => ({ ...f, accent: e.target.value }))} className="h-11 w-full rounded-xl border border-pf-border" />
            </label>
          </div>
          {editingId ? (
            <p className="mt-3 text-xs text-pf-ink-soft">Identificador: {editingId}</p>
          ) : (
            <p className="mt-3 text-xs text-pf-ink-soft">
              Identificador: {form.namePt ? slugify(form.namePt) : "—"} (gerado a partir do nome)
            </p>
          )}
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
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-pf-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-pf-cream-100 text-xs font-semibold uppercase tracking-wide text-pf-ink-soft">
              <tr>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Identificador</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pf-border">
              {categories.map((cat) => {
                const name = cat.name as Record<string, string>;
                return (
                  <tr key={cat.id}>
                    <td className="px-5 py-3 font-medium text-pf-ink">{name.pt}</td>
                    <td className="px-5 py-3 font-mono text-xs text-pf-ink-soft">{cat.id}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleActive(cat)}
                        className={
                          cat.active
                            ? "rounded-full bg-pf-green-100 px-2.5 py-1 text-xs font-semibold text-pf-green-700"
                            : "rounded-full bg-pf-cream-200 px-2.5 py-1 text-xs font-semibold text-pf-ink-soft"
                        }
                      >
                        {cat.active ? "Ativa" : "Inativa"}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      {confirmingId === cat.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs font-medium text-pf-clay">Excluir?</span>
                          <button onClick={() => handleDelete(cat.id)} className="flex h-9 w-9 items-center justify-center rounded-full bg-pf-clay text-white hover:bg-pf-clay/90" aria-label="Confirmar">
                            <Check size={15} />
                          </button>
                          <button onClick={() => setConfirmingId(null)} className="flex h-9 w-9 items-center justify-center rounded-full border border-pf-border text-pf-ink-soft hover:bg-pf-cream-100" aria-label="Cancelar">
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEdit(cat)} className="flex h-9 w-9 items-center justify-center rounded-full border border-pf-border text-pf-ink-soft hover:bg-pf-cream-100">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => setConfirmingId(cat.id)} className="flex h-9 w-9 items-center justify-center rounded-full border border-pf-border text-pf-clay hover:bg-pf-clay/10">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
