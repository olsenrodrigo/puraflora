import { useEffect, useState } from "react";
import { Check, MessageSquare, Star, Trash2, X } from "lucide-react";
import { useAdminFetch } from "@/context/AdminAuthContext";

interface Review {
  id: number;
  productId: number;
  rating: number;
  authorName: string;
  title: string | null;
  comment: string | null;
  status: string;
  verifiedPurchase: boolean;
  adminReply: string | null;
  createdAt: string;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-pf-gold-500/15 text-pf-gold-600" },
  approved: { label: "Aprovada", cls: "bg-pf-green-100 text-pf-green-700" },
  rejected: { label: "Rejeitada", cls: "bg-pf-clay/10 text-pf-clay" },
};

export default function AdminReviews() {
  const adminFetch = useAdminFetch();
  const [rows, setRows] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("pending");
  const [replyFor, setReplyFor] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [confirmDel, setConfirmDel] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    const qs = status ? `?status=${status}` : "";
    adminFetch(`/api/admin/reviews${qs}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const moderate = async (id: number, newStatus: string, adminReply?: string) => {
    const res = await adminFetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus, adminReply }),
    });
    if (res.ok) { setReplyFor(null); setReplyText(""); load(); }
  };

  const remove = async (id: number) => {
    setConfirmDel(null);
    const res = await adminFetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) load();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-pf-green-900">Avaliações</h1>
          <p className="mt-2 text-sm text-pf-ink-soft">Modere as avaliações dos clientes.</p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-pf-border px-3 py-2 text-sm">
          <option value="pending">Pendentes</option>
          <option value="approved">Aprovadas</option>
          <option value="rejected">Rejeitadas</option>
          <option value="">Todas</option>
        </select>
      </div>

      {loading ? (
        <p className="mt-8 text-pf-ink-soft">Carregando...</p>
      ) : rows.length === 0 ? (
        <p className="mt-10 text-center text-pf-ink-soft">Nenhuma avaliação neste filtro.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((r) => {
            const st = STATUS[r.status] ?? STATUS.pending;
            return (
              <div key={r.id} className="rounded-2xl border border-pf-border bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={15} className={i + 1 <= r.rating ? "text-pf-gold-500" : "text-pf-sand"} fill={i + 1 <= r.rating ? "currentColor" : "none"} />
                      ))}
                    </span>
                    <span className="font-semibold text-pf-ink">{r.authorName}</span>
                    {r.verifiedPurchase && <span className="text-xs font-medium text-pf-green-700">✓ compra verificada</span>}
                    <span className="text-xs text-pf-ink-soft">· produto #{r.productId}</span>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                </div>
                {r.title && <p className="mt-2 font-semibold text-pf-ink">{r.title}</p>}
                {r.comment && <p className="mt-1 text-sm text-pf-ink-soft">{r.comment}</p>}
                {r.adminReply && (
                  <p className="mt-2 rounded-lg bg-pf-cream-100 p-2 text-sm text-pf-ink-soft"><b>Resposta:</b> {r.adminReply}</p>
                )}

                {replyFor === r.id ? (
                  <div className="mt-3 flex gap-2">
                    <input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Resposta da loja (opcional)" className="input flex-1" />
                    <button onClick={() => moderate(r.id, "approved", replyText || undefined)} className="rounded-full bg-pf-green-700 px-4 py-2 text-sm font-semibold text-pf-cream">Aprovar</button>
                    <button onClick={() => { setReplyFor(null); setReplyText(""); }} className="rounded-full border border-pf-border px-4 py-2 text-sm">Cancelar</button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {r.status !== "approved" && (
                      <button onClick={() => moderate(r.id, "approved")} className="flex items-center gap-1.5 rounded-full bg-pf-green-700 px-4 py-1.5 text-xs font-semibold text-pf-cream"><Check size={13} /> Aprovar</button>
                    )}
                    {r.status !== "rejected" && (
                      <button onClick={() => moderate(r.id, "rejected")} className="flex items-center gap-1.5 rounded-full border border-pf-border px-4 py-1.5 text-xs font-semibold text-pf-ink-soft"><X size={13} /> Rejeitar</button>
                    )}
                    <button onClick={() => { setReplyFor(r.id); setReplyText(r.adminReply || ""); }} className="flex items-center gap-1.5 rounded-full border border-pf-border px-4 py-1.5 text-xs font-semibold text-pf-ink-soft"><MessageSquare size={13} /> Responder</button>
                    {confirmDel === r.id ? (
                      <span className="flex items-center gap-1.5">
                        <span className="text-xs text-pf-clay">Excluir?</span>
                        <button onClick={() => remove(r.id)} className="rounded-full bg-pf-clay px-3 py-1.5 text-xs font-semibold text-white">Sim</button>
                        <button onClick={() => setConfirmDel(null)} className="rounded-full border border-pf-border px-3 py-1.5 text-xs">Não</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDel(r.id)} className="flex items-center gap-1.5 rounded-full border border-pf-border px-4 py-1.5 text-xs font-semibold text-pf-clay"><Trash2 size={13} /> Excluir</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
