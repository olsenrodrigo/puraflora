import { useEffect, useState } from "react";
import { useLocation, useParams, Link } from "wouter";
import { ArrowLeft, Upload } from "lucide-react";
import { useAdminFetch } from "@/context/AdminAuthContext";
import { useProducts } from "@/context/ProductsContext";
import type { ProductText } from "../../../shared/schema";

const EMPTY_TEXT: ProductText = {
  name: "",
  tagline: "",
  size: "",
  description: "",
  highlights: [],
  composition: [],
  usage: "",
  indication: "",
};

interface FormState {
  slug: string;
  image: string;
  categoryId: string;
  price: string;
  compareAtPrice: string;
  costPrice: string;
  rating: string;
  reviews: string;
  featured: boolean;
  badge: string;
  heroOrder: string;
  heroAccent: string;
  weightG: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  active: boolean;
  i18n: { pt: ProductText; en: ProductText };
}

const EMPTY_FORM: FormState = {
  slug: "",
  image: "/products/placeholder.webp",
  categoryId: "",
  price: "",
  compareAtPrice: "",
  costPrice: "",
  rating: "4.8",
  reviews: "0",
  featured: false,
  badge: "",
  heroOrder: "",
  heroAccent: "#cdb59b",
  weightG: "300",
  lengthCm: "11",
  widthCm: "6",
  heightCm: "6",
  active: true,
  i18n: { pt: { ...EMPTY_TEXT }, en: { ...EMPTY_TEXT } },
};

function linesToArray(text: string): string[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}

export default function AdminProductForm() {
  const params = useParams<{ id?: string }>();
  const isEdit = !!params.id;
  const [, setLocation] = useLocation();
  const adminFetch = useAdminFetch();
  const { categories, refetch: refetchStorefront } = useProducts();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lang, setLang] = useState<"pt" | "en">("pt");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productId, setProductId] = useState<number | null>(params.id ? Number(params.id) : null);

  useEffect(() => {
    if (!isEdit) return;
    adminFetch(`/api/admin/products/${params.id}`)
      .then((r) => r.json())
      .then((p) => {
        setForm({
          slug: p.slug,
          image: p.image,
          categoryId: p.categoryId,
          price: String(p.price),
          compareAtPrice: p.compareAtPrice != null ? String(p.compareAtPrice) : "",
          costPrice: p.costPrice != null ? String(p.costPrice) : "",
          rating: String(p.rating),
          reviews: String(p.reviews),
          featured: p.featured,
          badge: p.badge ?? "",
          heroOrder: p.heroOrder != null ? String(p.heroOrder) : "",
          heroAccent: p.heroAccent ?? "#cdb59b",
          weightG: String(p.weightG),
          lengthCm: String(p.lengthCm),
          widthCm: String(p.widthCm),
          heightCm: String(p.heightCm),
          active: p.active,
          i18n: p.i18n,
        });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const updateText = (field: keyof ProductText, value: string | string[]) => {
    setForm((f) => ({
      ...f,
      i18n: { ...f.i18n, [lang]: { ...f.i18n[lang], [field]: value } },
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        slug: form.slug,
        image: form.image,
        categoryId: form.categoryId,
        price: form.price,
        compareAtPrice: form.compareAtPrice || null,
        costPrice: form.costPrice || null,
        rating: form.rating,
        reviews: Number(form.reviews),
        featured: form.featured,
        badge: form.badge || null,
        heroOrder: form.heroOrder ? Number(form.heroOrder) : null,
        heroAccent: form.heroOrder ? form.heroAccent : null,
        weightG: Number(form.weightG),
        lengthCm: form.lengthCm,
        widthCm: form.widthCm,
        heightCm: form.heightCm,
        active: form.active,
        i18n: form.i18n,
      };
      const res = await adminFetch(
        isEdit ? `/api/admin/products/${productId}` : "/api/admin/products",
        { method: isEdit ? "PUT" : "POST", body: JSON.stringify(payload) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao salvar produto");
      refetchStorefront();
      if (!isEdit) {
        setProductId(data.id);
        setLocation(`/admin/produtos/${data.id}/editar`);
      } else {
        setLocation("/admin/produtos");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file: File) => {
    if (!productId) return;
    const fd = new FormData();
    fd.append("image", file);
    const res = await adminFetch(`/api/admin/products/${productId}/image`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    if (res.ok) {
      setForm((f) => ({ ...f, image: data.image }));
      refetchStorefront();
    }
  };

  if (loading) return <p className="text-pf-ink-soft">Carregando...</p>;

  const text = form.i18n[lang];

  return (
    <div className="max-w-3xl">
      <Link href="/admin/produtos" className="flex items-center gap-1.5 text-sm font-medium text-pf-green-700 hover:underline">
        <ArrowLeft size={15} /> Voltar aos produtos
      </Link>
      <h1 className="mt-3 font-display text-2xl font-semibold text-pf-green-900">
        {isEdit ? "Editar produto" : "Novo produto"}
      </h1>

      <form onSubmit={submit} className="mt-6 space-y-6">
        {/* dados gerais */}
        <section className="rounded-2xl border border-pf-border bg-white p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-pf-green-900">Dados gerais</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Slug (URL)">
              <input
                required
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="meu-produto"
                className="input"
              />
            </Field>
            <Field label="Categoria">
              <select
                required
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                className="input"
              >
                <option value="" disabled>Selecione...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name.pt}</option>
                ))}
              </select>
            </Field>
            <Field label="Preço (R$)">
              <input required type="number" step="0.01" value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="input" />
            </Field>
            <Field label="Preço antigo (opcional)">
              <input type="number" step="0.01" value={form.compareAtPrice}
                onChange={(e) => setForm((f) => ({ ...f, compareAtPrice: e.target.value }))} className="input" />
            </Field>
            <Field label="Custo (R$, opcional)">
              <input type="number" step="0.01" value={form.costPrice}
                onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))} className="input" />
              <span className="mt-1 block text-xs text-pf-ink-soft">
                Usado para calcular margem de lucro nos relatórios
              </span>
            </Field>
            <Field label="Avaliação (0–5)">
              <input type="number" step="0.1" min="0" max="5" value={form.rating}
                onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))} className="input" />
            </Field>
            <Field label="Nº de avaliações">
              <input type="number" min="0" value={form.reviews}
                onChange={(e) => setForm((f) => ({ ...f, reviews: e.target.value }))} className="input" />
            </Field>
            <Field label="Badge (opcional)">
              <select value={form.badge} onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))} className="input">
                <option value="">Nenhum</option>
                <option value="bestSeller">Mais vendido</option>
                <option value="new">Novo</option>
              </select>
            </Field>
            <Field label="Status">
              <select
                value={form.active ? "1" : "0"}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === "1" }))}
                className="input"
              >
                <option value="1">Ativo (aparece na loja)</option>
                <option value="0">Inativo (oculto)</option>
              </select>
            </Field>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-pf-ink">
            <input type="checkbox" checked={form.featured}
              onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} />
            Destacar na seção "Nossos queridinhos" da Home
          </label>
        </section>

        {/* imagem */}
        <section className="rounded-2xl border border-pf-border bg-white p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-pf-green-900">Imagem</h2>
          <div className="flex items-center gap-4">
            <img src={form.image} alt="" className="h-20 w-20 rounded-xl border border-pf-border object-contain bg-pf-cream-100" />
            {productId ? (
              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-pf-border px-4 py-2.5 text-sm font-semibold text-pf-ink-soft hover:bg-pf-cream-100">
                <Upload size={15} /> Enviar imagem
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
                />
              </label>
            ) : (
              <p className="text-sm text-pf-ink-soft">Salve o produto primeiro para enviar uma imagem.</p>
            )}
          </div>
        </section>

        {/* conteúdo bilíngue */}
        <section className="rounded-2xl border border-pf-border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-pf-green-900">Conteúdo</h2>
            <div className="flex rounded-full border border-pf-border p-1">
              {(["pt", "en"] as const).map((l) => (
                <button
                  type="button"
                  key={l}
                  onClick={() => setLang(l)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${lang === l ? "bg-pf-green-700 text-pf-cream" : "text-pf-ink-soft"}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Field label="Nome">
              <input required value={text.name} onChange={(e) => updateText("name", e.target.value)} className="input" />
            </Field>
            <Field label="Chamada (tagline)">
              <input value={text.tagline} onChange={(e) => updateText("tagline", e.target.value)} className="input" />
            </Field>
            <Field label="Tamanho/quantidade">
              <input value={text.size} onChange={(e) => updateText("size", e.target.value)} placeholder="60 cápsulas · 500mg" className="input" />
            </Field>
            <Field label="Descrição">
              <textarea value={text.description} onChange={(e) => updateText("description", e.target.value)} rows={3} className="input" />
            </Field>
            <Field label="Diferenciais (um por linha)">
              <textarea
                value={text.highlights.join("\n")}
                onChange={(e) => updateText("highlights", linesToArray(e.target.value))}
                rows={3}
                className="input"
              />
            </Field>
            <Field label="Composição (um item por linha)">
              <textarea
                value={text.composition.join("\n")}
                onChange={(e) => updateText("composition", linesToArray(e.target.value))}
                rows={2}
                className="input"
              />
            </Field>
            <Field label="Modo de uso">
              <input value={text.usage} onChange={(e) => updateText("usage", e.target.value)} className="input" />
            </Field>
            <Field label="Indicação">
              <input value={text.indication} onChange={(e) => updateText("indication", e.target.value)} className="input" />
            </Field>
          </div>
        </section>

        {/* frete */}
        <section className="rounded-2xl border border-pf-border bg-white p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-pf-green-900">Envio (peso e dimensões)</h2>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Peso (g)">
              <input type="number" value={form.weightG} onChange={(e) => setForm((f) => ({ ...f, weightG: e.target.value }))} className="input" />
            </Field>
            <Field label="Comprimento (cm)">
              <input type="number" step="0.1" value={form.lengthCm} onChange={(e) => setForm((f) => ({ ...f, lengthCm: e.target.value }))} className="input" />
            </Field>
            <Field label="Largura (cm)">
              <input type="number" step="0.1" value={form.widthCm} onChange={(e) => setForm((f) => ({ ...f, widthCm: e.target.value }))} className="input" />
            </Field>
            <Field label="Altura (cm)">
              <input type="number" step="0.1" value={form.heightCm} onChange={(e) => setForm((f) => ({ ...f, heightCm: e.target.value }))} className="input" />
            </Field>
          </div>
        </section>

        {error && <p className="rounded-lg bg-pf-clay/10 px-4 py-3 text-sm text-pf-clay">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-pf-green-700 px-8 py-3 text-sm font-semibold text-pf-cream hover:bg-pf-green-600 disabled:opacity-60"
        >
          {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar produto"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-pf-ink">{label}</span>
      {children}
    </label>
  );
}
