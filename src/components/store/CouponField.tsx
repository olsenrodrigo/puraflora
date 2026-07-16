import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tag, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { brl } from "@/lib/utils";

const REASON_KEY: Record<string, string> = {
  not_found: "cart.couponInvalid",
  inactive: "cart.couponInvalid",
  not_started: "cart.couponNotStarted",
  expired: "cart.couponExpired",
  exhausted: "cart.couponExhausted",
  network: "cart.couponNetwork",
};

export default function CouponField() {
  const { t } = useTranslation();
  const { coupon, couponBelowMin, discount, applyCoupon, removeCoupon } = useCart();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    const r = await applyCoupon(code);
    setLoading(false);
    if (r.ok) setCode("");
    else setError(t(REASON_KEY[r.reason ?? ""] ?? "cart.couponInvalid"));
  };

  if (coupon) {
    return (
      <div className="mt-4">
        <div className="flex items-center justify-between gap-2 rounded-xl border border-pf-green-500/40 bg-pf-green-50 px-3 py-2">
          <span className="flex items-center gap-2 text-sm font-semibold text-pf-green-700">
            <Tag size={15} /> {coupon.code}
            {discount > 0 && <span className="text-pf-green-600">−{brl(discount)}</span>}
          </span>
          <button
            type="button"
            onClick={removeCoupon}
            className="text-pf-ink-soft/60 hover:text-pf-clay"
            aria-label={t("cart.couponRemove")}
          >
            <X size={16} />
          </button>
        </div>
        {couponBelowMin && coupon.minOrderValue != null && (
          <p className="mt-1 text-xs text-pf-clay">
            {t("cart.couponMinOrder", { min: brl(coupon.minOrderValue) })}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={t("cart.couponPlaceholder")}
          className="flex-1 rounded-xl border border-pf-green-900/12 bg-pf-cream/40 px-3.5 py-2.5 text-sm text-pf-ink outline-none focus:border-pf-green-400 focus:bg-white"
        />
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="rounded-xl border border-pf-border px-4 py-2.5 text-sm font-semibold text-pf-ink-soft hover:bg-pf-cream-100 disabled:opacity-60"
        >
          {t("cart.couponApply")}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-pf-clay">{error}</p>}
    </div>
  );
}
