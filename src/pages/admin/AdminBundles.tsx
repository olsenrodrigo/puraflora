import { useEffect, useState } from "react";
import { Check, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import { useAdminFetch } from "@/context/AdminAuthContext";
import { useProducts } from "@/context/ProductsContext";
import { brl } from "@/lib/utils";
import { priceBundle, type BundleDiscountType } from "../../../shared/bundle-pricing";

interface BundleItem { productId: number; quantity: number; }
interface FormState {
  id: number | null;
  slug: string;
  namePt: string;
  descPt: string;
  discountType: BundleDiscountType;
  discountValue: string;
  active: boolean;
  items: BundleItem[];
}
const EMPTY: FormState = { id: null, slug: "", namePt: "", descPt: "", discountType: "percentage", discountValue: "10", active: true, items: [] };

const TYPE_LABEL: Record<string, string> = { percentage: "% desconto", fixed: "R$ desconto", fixed_price: "Preço fixo do kit" };

export default function AdminBundles() {
  const adminFetch = useAdminFetch();
  const { products } = useProducts();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const [err, setErr] = useState("");

  const prodName = (p: any) => p?.i18n?.pt?.name ?? p?.slug ?? `#${p?.id}`;
  const prodById = (id: number) => products.find((p: any) => p.id === id);

  const load = () => {
    setLoading(true);
    adminFetch("/api/admin/bundles").then((r) => (r.ok ? r.json() : [])).then(setRows).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ ...EMPTY }); setErr(""); setShowForm(true); };
  const openEdit = (b: any) => {
    setForm({
      id: b.id, slug: b.slug, namePt: b.i18n?.pt?.name ?? "", descPt: b.i18n?.pt?.description ?? "",
      discountType: b.discountType, discountValue: String(b.discountValue), active: b.active,
      items: (b.components ?? []).map((c: any) => ({ productId: c.productId, quantity: c.quantity })),
    });
    setErr(""); setShowForm(true);
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { productId: products[0]?.id ?? 0, quantity: 1 }] }));
  const setItem = (i: number, patch: Partial<BundleItem>) =>
    setForm((f) => ({ ...f, items: f.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) }));
  const removeItem = (i: number) => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const preview = () => {
    const comps = form.items.map((it) => {
      const p = prodById(it.productId);
      return { productSlug: p?.slug ?? "", unitPrice: Number(p?.price ?? 0), quantity: it.quantity };
    }).filter((c) => c.productSlug);
    if (comps.length === 0) return null;
    return priceBundle(form.discountType, Number(form.discountValue) || 0, comps);
  };

  const save = async () => {
    setErr("");
    if (!form.slug.trim() || !form.namePt.trim() || form.items.length === 0) {
      setErr("Slug, nome e ao menos 1 produto são obrigatórios"); return;
    }
    const payload = {
      slug: form.slug.trim(), i18n: { pt: { name: form.namePt.trim(), description: form.descPt || undefined } },
      discountType: form.discountType, discountValue: form.discountValue, active: form.active,
      items: form.items.filter((it) => it.productId > 0),
    };
    const res = await adminFetch(form.id ? `/api/admin/bundles/${form.id}` : "/api/admin/bundles", {
      method: form.id ? "PUT" : "POST", body: JSON.stringify(payload),
    });
    if (res.ok) { setShowForm(false); setForm({ ...EMPTY }); load(); }
    else { const d = await res.json().catch(() => ({})); setErr(d.error || "Falha ao salvar"); }
  };

  const remove = async (id: number) => {
    setConfirmDel(null);
    const res = await adminFetch(`/api/admin/bundles/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) load();
  };

  const pv = preview();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-pf-green-900">Kits (compre junto)</h1>
          <p className="mt-2 text-sm text-pf-ink-soft">Combos de produtos com desconto.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 rounded-full bg-pf-green-700 px-5 py-2.5 text-sm font-semibold text-pf-cream"><Plus size={16} /> Novo kit</button>
      </div>

      {showForm && (
        <div className="mt-6 rounded-2xl border border-pf-border bg-white p-6">
          <h3 className="font-semibold text-pf-green-900">{form.id ? "Editar kit" : "Criar kit"}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="text-sm font-semibold text-pf-ink">Slug *</span>
              <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} className="input mt-1 font-mono" placeholder="kit-imunidade" /></label>
            <label className="block"><span className="text-sm font-semibold text-pf-ink">Nome *</span>
              <input value={form.namePt} onChange={(e) => setForm((f) => ({ ...f, namePt: e.target.value }))} className="input mt-1" placeholder="Kit Imunidade" /></label>
            <label className="block"><span className="text-sm font-semibold text-pf-ink">Tipo de desconto</span>
              <select value={form.discountType} onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as BundleDiscountType }))} className="input mt-1">
                <option value="percentage">Porcentagem (%)</option>
                <option value="fixed">Valor fixo (R$ off)</option>
                <option value="fixed_price">Preço fixo do kit (R$)</option>
              </select></label>
            <label className="block"><span className="text-sm font-semibold text-pf-ink">Valor</span>
              <input type="number" value={form.discountValue} onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))} className="input mt-1" /></label>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-pf-ink">Produtos do kit</span>
              <button onClick={addItem} className="text-sm font-semibold text-pf-green-700">+ Adicionar produto</button>
            </div>
            <div className="mt-2 space-y-2">
              {form.items.map((it, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select value={it.productId} onChange={(e) => setItem(i, { productId: Number(e.target.value) })} className="input flex-1">
                    {products.map((p: any) => <option key={p.id} value={p.id}>{prodName(p)} — {brl(Number(p.price))}</option>)}
                  </select>
                  <input type="number" min={1} value={it.quantity} onChange={(e) => setItem(i, { quantity: Math.max(1, Number(e.target.value)) })} className="input w-20" />
                  <button onClick={() => removeItem(i)} className="text-pf-clay"><X size={16} /></button>
                </div>
              ))}
              {form.items.length === 0 && <p className="text-sm text-pf-ink-soft">Nenhum produto adicionado.</p>}
            </div>
          </div>

          {pv && (
            <div className="mt-4 rounded-xl bg-pf-green-50 p-3 text-sm">
              <span className="text-pf-ink-soft line-through mr-2">{brl(pv.originalTotal)}</span>
              <span className="font-bold text-pf-green-800">{brl(pv.bundleTotal)}</span>
              <span className="ml-2 text-pf-green-700">(economia {brl(pv.discount)})</span>
            </div>
          )}
          {err && <p className="mt-3 text-sm text-pf-clay">{err}</p>}
          <div className="mt-4 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-pf-ink-soft">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="h-4 w-4 accent-pf-green-700" /> Ativo
            </label>
            <button onClick={() => setShowForm(false)} className="ml-auto rounded-full border border-pf-border px-5 py-2 text-sm font-semibold text-pf-ink-soft">Cancelar</button>
            <button onClick={save} className="rounded-full bg-pf-green-700 px-5 py-2 text-sm font-semibold text-pf-cream">{form.id ? "Salvar" : "Criar"}</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-pf-ink-soft">Carregando...</p>
      ) : rows.length === 0 ? (
        <div className="mt-10 text-center text-pf-ink-soft"><Package size={40} className="mx-auto mb-2 opacity-30" /><p>Nenhum kit criado</p></div>
      ) : (
        <div className="mt-6 space-y-3">
          {rows.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-2xl border border-pf-border bg-white p-4">
              <div>
                <p className="font-semibold text-pf-green-900">{b.i18n?.pt?.name ?? b.slug} {!b.active && <span className="text-xs text-pf-ink-soft">(inativo)</span>}</p>
                <p className="text-xs text-pf-ink-soft">{(b.components ?? []).map((c: any) => `${c.quantity}x ${c.productName}`).join(" + ")} · {TYPE_LABEL[b.discountType]} {b.discountValue}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(b)} className="p-2 text-pf-ink-soft hover:text-pf-green-700"><Pencil size={16} /></button>
                {confirmDel === b.id ? (
                  <span className="flex items-center gap-1.5">
                    <button onClick={() => remove(b.id)} className="rounded-full bg-pf-clay px-3 py-1.5 text-xs font-semibold text-white"><Check size={13} /></button>
                    <button onClick={() => setConfirmDel(null)} className="rounded-full border border-pf-border px-3 py-1.5 text-xs"><X size={13} /></button>
                  </span>
                ) : (
                  <button onClick={() => setConfirmDel(b.id)} className="p-2 text-pf-clay hover:text-pf-clay"><Trash2 size={16} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
