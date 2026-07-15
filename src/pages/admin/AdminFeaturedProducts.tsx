import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useAdminFetch } from "@/context/AdminAuthContext";
import { useProducts } from "@/context/ProductsContext";
import { brl, cn } from "@/lib/utils";
import type { ProductRow } from "../../../shared/schema";

const MAX_FEATURED = 8;

export default function AdminFeaturedProducts() {
  const adminFetch = useAdminFetch();
  const { refetch: refetchStorefront } = useProducts();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch("/api/admin/products");
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const featuredCount = products.filter((p) => p.featured).length;

  const toggle = async (p: ProductRow) => {
    setError(null);
    const res = await adminFetch(`/api/admin/products/${p.id}/featured`, {
      method: "PUT",
      body: JSON.stringify({ featured: !p.featured }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Falha ao atualizar destaque");
      return;
    }
    await load();
    refetchStorefront();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-pf-green-900">
          Produtos em destaque
        </h1>
        <span
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-semibold",
            featuredCount >= MAX_FEATURED
              ? "bg-pf-clay/10 text-pf-clay"
              : featuredCount > 0
                ? "bg-pf-green-100 text-pf-green-700"
                : "bg-pf-cream-200 text-pf-ink-soft"
          )}
        >
          {featuredCount} / {MAX_FEATURED} destacados
        </span>
      </div>
      <p className="mt-2 text-sm text-pf-ink-soft">
        Aparecem na seção "Nossos queridinhos" da Home. Máximo de {MAX_FEATURED} produtos.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-pf-clay/10 px-4 py-3 text-sm text-pf-clay">{error}</p>
      )}

      {loading ? (
        <p className="mt-8 text-pf-ink-soft">Carregando...</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {products.map((p) => {
            const name = (p.i18n as any)?.pt?.name ?? p.slug;
            return (
              <div
                key={p.id}
                className={cn(
                  "relative rounded-2xl border bg-white p-4 transition-all",
                  p.featured ? "border-pf-gold-500 ring-2 ring-pf-gold-400" : "border-pf-border"
                )}
              >
                {p.featured && (
                  <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-pf-gold-500 text-pf-green-900 shadow">
                    <Star size={14} fill="currentColor" />
                  </span>
                )}
                <img
                  src={p.image}
                  alt=""
                  className="mx-auto h-24 w-24 object-contain"
                />
                <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-medium text-pf-ink">
                  {name}
                </p>
                <p className="mt-1 text-sm font-semibold text-pf-green-700">{brl(Number(p.price))}</p>
                <button
                  onClick={() => toggle(p)}
                  disabled={!p.featured && featuredCount >= MAX_FEATURED}
                  className={cn(
                    "mt-3 w-full rounded-full px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    p.featured
                      ? "bg-pf-gold-500 text-pf-green-900 hover:bg-pf-gold-400"
                      : "border border-pf-border text-pf-ink-soft hover:bg-pf-cream-100"
                  )}
                >
                  {p.featured ? "Destacado" : "Destacar"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
