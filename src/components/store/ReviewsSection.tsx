import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Star, BadgeCheck } from "lucide-react";
import type { Lang } from "@/i18n";

interface Review {
  id: number;
  rating: number;
  authorName: string;
  title: string | null;
  comment: string | null;
  verifiedPurchase: boolean;
  adminReply: string | null;
  createdAt: string;
}
interface Aggregate {
  count: number;
  average: number;
  distribution: Record<number, number>;
}

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i + 1 <= Math.round(value) ? "text-pf-gold-500" : "text-pf-sand"}
          fill={i + 1 <= Math.round(value) ? "currentColor" : "none"}
          strokeWidth={1.6}
        />
      ))}
    </span>
  );
}

export default function ReviewsSection({ slug }: { slug: string }) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.split("-")[0] as Lang) || "pt";
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [done, setDone] = useState<null | "pending" | "approved">(null);
  const [form, setForm] = useState({ rating: 5, authorName: "", comment: "", authorEmail: "", orderNumber: "", website: "" });

  const load = () => {
    fetch(`/api/store/products/${slug}/reviews`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setAggregate(d.aggregate);
          setReviews(d.reviews);
          setEnabled(d.reviewsEnabled !== false);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const submit = async () => {
    if (!form.authorName.trim() || form.rating < 1) return;
    setSubmitting(true);
    setError(false);
    try {
      const res = await fetch(`/api/store/products/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: form.rating,
          authorName: form.authorName.trim(),
          comment: form.comment.trim() || null,
          authorEmail: form.authorEmail.trim() || null,
          orderNumber: form.orderNumber.trim() || null,
          locale: lang,
          website: form.website, // honeypot
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setDone(d.status === "approved" ? "approved" : "pending");
        setShowForm(false);
        setForm({ rating: 5, authorName: "", comment: "", authorEmail: "", orderNumber: "", website: "" });
        if (d.status === "approved") load();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const count = aggregate?.count ?? 0;

  return (
    <section className="mt-14 border-t border-pf-green-900/8 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-pf-green-900">{t("reviews.title")}</h2>
          {count > 0 ? (
            <div className="mt-2 flex items-center gap-2">
              <Stars value={aggregate!.average} size={18} />
              <span className="text-lg font-semibold text-pf-ink">{aggregate!.average.toFixed(1)}</span>
              <span className="text-sm text-pf-ink-soft">
                ({count} {count === 1 ? t("reviews.one") : t("reviews.many")})
              </span>
            </div>
          ) : (
            <p className="mt-2 text-sm text-pf-ink-soft">{t("reviews.empty")}</p>
          )}
        </div>
        {enabled && (
          <button
            type="button"
            onClick={() => { setShowForm((s) => !s); setDone(null); setError(false); }}
            className="rounded-full bg-pf-green-700 px-5 py-2.5 text-sm font-semibold text-pf-cream hover:bg-pf-green-800"
          >
            {t("reviews.write")}
          </button>
        )}
      </div>

      {done && (
        <p className="mt-4 rounded-xl bg-pf-green-100 px-4 py-3 text-sm text-pf-green-800">
          {done === "pending" ? t("reviews.thanksPending") : t("reviews.thanksApproved")}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl bg-pf-clay/10 px-4 py-3 text-sm text-pf-clay">
          {t("reviews.error")}
        </p>
      )}

      {/* Distribuição */}
      {count > 0 && (
        <div className="mt-6 max-w-md space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const n = aggregate!.distribution[star] ?? 0;
            const pct = count ? Math.round((n / count) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="w-8 text-pf-ink-soft">{star}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-pf-cream-200">
                  <div className="h-full rounded-full bg-pf-gold-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-right text-xs text-pf-ink-soft">{n}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Formulário */}
      {enabled && showForm && (
        <div className="mt-6 rounded-2xl border border-pf-border bg-white p-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-pf-ink">{t("reviews.yourRating")}:</span>
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} type="button" onClick={() => setForm((f) => ({ ...f, rating: i + 1 }))} aria-label={`${i + 1}`}>
                <Star size={22} className={i + 1 <= form.rating ? "text-pf-gold-500" : "text-pf-sand"} fill={i + 1 <= form.rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input value={form.authorName} onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))} placeholder={t("reviews.name")} className="input" />
            <input value={form.authorEmail} onChange={(e) => setForm((f) => ({ ...f, authorEmail: e.target.value }))} placeholder={t("reviews.emailOptional")} className="input" />
          </div>
          <input value={form.orderNumber} onChange={(e) => setForm((f) => ({ ...f, orderNumber: e.target.value }))} placeholder={t("reviews.orderOptional")} className="input mt-3" />
          <textarea value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} placeholder={t("reviews.comment")} rows={4} className="input mt-3" />
          {/* honeypot */}
          <input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-pf-border px-5 py-2 text-sm font-semibold text-pf-ink-soft">{t("reviews.cancel")}</button>
            <button type="button" onClick={submit} disabled={submitting || !form.authorName.trim()} className="rounded-full bg-pf-green-700 px-5 py-2 text-sm font-semibold text-pf-cream disabled:opacity-60">
              {submitting ? "..." : t("reviews.send")}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="mt-8 space-y-5">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl border border-pf-border bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stars value={r.rating} />
                <span className="font-semibold text-pf-ink">{r.authorName}</span>
                {r.verifiedPurchase && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-pf-green-700">
                    <BadgeCheck size={14} /> {t("reviews.verified")}
                  </span>
                )}
              </div>
              <span className="text-xs text-pf-ink-soft">{new Date(r.createdAt).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US")}</span>
            </div>
            {r.title && <p className="mt-2 font-semibold text-pf-ink">{r.title}</p>}
            {r.comment && <p className="mt-1 text-sm text-pf-ink-soft">{r.comment}</p>}
            {r.adminReply && (
              <div className="mt-3 rounded-xl bg-pf-cream-100 p-3 text-sm">
                <span className="font-semibold text-pf-green-800">{t("reviews.storeReply")}: </span>
                <span className="text-pf-ink-soft">{r.adminReply}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
