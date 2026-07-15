import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useAdminFetch } from "@/context/AdminAuthContext";
import { useProducts } from "@/context/ProductsContext";
import { brl } from "@/lib/utils";
import type { ProductRow } from "../../../shared/schema";

export default function AdminProducts() {
  const adminFetch = useAdminFetch();
  const { refetch: refetchStorefront } = useProducts();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

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

  const handleDelete = async (id: number) => {
    setConfirmingId(null);
    await adminFetch(`/api/admin/products/${id}`, { method: "DELETE" });
    await load();
    refetchStorefront();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-pf-green-900">Produtos</h1>
        <Link
          href="/admin/produtos/novo"
          className="flex items-center gap-2 rounded-full bg-pf-green-700 px-5 py-2.5 text-sm font-semibold text-pf-cream hover:bg-pf-green-600"
        >
          <Plus size={16} /> Novo produto
        </Link>
      </div>

      {loading ? (
        <p className="mt-8 text-pf-ink-soft">Carregando...</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-pf-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-pf-cream-100 text-xs font-semibold uppercase tracking-wide text-pf-ink-soft">
              <tr>
                <th className="px-5 py-3">Produto</th>
                <th className="px-5 py-3">Categoria</th>
                <th className="px-5 py-3">Preço</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pf-border">
              {products.map((p) => {
                const name = (p.i18n as any)?.pt?.name ?? p.slug;
                return (
                  <tr key={p.id}>
                    <td className="flex items-center gap-3 px-5 py-3">
                      <img src={p.image} alt="" className="h-10 w-10 rounded-lg object-contain bg-pf-cream-100" />
                      <div>
                        <p className="font-medium text-pf-ink">{name}</p>
                        <p className="text-xs text-pf-ink-soft">{p.slug}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-pf-ink-soft">{p.categoryId}</td>
                    <td className="px-5 py-3 font-semibold text-pf-green-700">{brl(Number(p.price))}</td>
                    <td className="px-5 py-3">
                      <span
                        className={
                          p.active
                            ? "rounded-full bg-pf-green-100 px-2.5 py-1 text-xs font-semibold text-pf-green-700"
                            : "rounded-full bg-pf-cream-200 px-2.5 py-1 text-xs font-semibold text-pf-ink-soft"
                        }
                      >
                        {p.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {confirmingId === p.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs font-medium text-pf-clay">Excluir "{name}"?</span>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-pf-clay text-white hover:bg-pf-clay/90"
                            aria-label="Confirmar exclusão"
                          >
                            <Check size={15} />
                          </button>
                          <button
                            onClick={() => setConfirmingId(null)}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-pf-border text-pf-ink-soft hover:bg-pf-cream-100"
                            aria-label="Cancelar"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/produtos/${p.id}/editar`}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-pf-border text-pf-ink-soft hover:bg-pf-cream-100"
                          >
                            <Pencil size={15} />
                          </Link>
                          <button
                            onClick={() => setConfirmingId(p.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-pf-border text-pf-clay hover:bg-pf-clay/10"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-pf-ink-soft">
                    Nenhum produto cadastrado ainda.
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
