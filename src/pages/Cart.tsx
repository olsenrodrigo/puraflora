import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import type { Lang } from "@/i18n";
import { tp, FREE_SHIPPING_THRESHOLD } from "@/data/catalog";
import { useCart } from "@/context/CartContext";
import CouponField from "@/components/store/CouponField";
import { brl } from "@/lib/utils";

export default function Cart() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.split("-")[0] as Lang) || "pt";
  const { lines, bundles, subtotal, setQty, remove, removeBundle, clear, itemCount, coupon, discount } = useCart();

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  if (lines.length === 0 && bundles.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 bg-pf-cream px-4 pt-24 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pf-green-100">
          <ShoppingBag size={30} className="text-pf-green-500" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-pf-green-900">
            {t("cart.empty")}
          </h1>
          <p className="mt-2 text-pf-ink-soft">{t("cart.emptySub")}</p>
        </div>
        <Link
          href="/loja"
          className="rounded-full bg-pf-green-700 px-7 py-3.5 text-sm font-semibold text-pf-cream hover:bg-pf-green-600"
        >
          {t("cart.emptyCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pf-cream pb-20 pt-24 md:pt-28">
      <div className="container-pf">
        <h1 className="font-display text-3xl font-semibold text-pf-green-900 md:text-4xl">
          {t("cart.title")}
        </h1>
        <p className="mt-1 text-pf-ink-soft">
          {t(itemCount === 1 ? "store.results_one" : "store.results_other", {
            count: itemCount,
          })}
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* items */}
          <div>
            <ul className="space-y-3">
              {lines.map(({ product, quantity, lineTotal }) => {
                const text = tp(product, lang);
                return (
                  <li
                    key={product.slug}
                    className="flex gap-4 rounded-2xl border border-pf-green-900/8 bg-white p-4"
                  >
                    <Link
                      href={`/loja/produto/${product.slug}`}
                      className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-pf-cream-100 sm:h-28 sm:w-28"
                    >
                      <img
                        src={product.image}
                        alt={text.name}
                        className="h-full w-full object-contain p-2"
                      />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link
                            href={`/loja/produto/${product.slug}`}
                            className="font-display text-base font-semibold text-pf-green-900 hover:text-pf-green-600"
                          >
                            {text.name}
                          </Link>
                          <p className="mt-0.5 text-xs text-pf-ink-soft">
                            {text.size}
                          </p>
                        </div>
                        <button
                          onClick={() => remove(product.slug)}
                          className="shrink-0 text-pf-ink-soft/60 hover:text-pf-clay"
                          aria-label={t("cart.remove")}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-3">
                        <div className="flex items-center rounded-full border border-pf-green-900/12">
                          <button
                            onClick={() => setQty(product.slug, quantity - 1)}
                            className="flex h-9 w-9 items-center justify-center text-pf-ink-soft hover:text-pf-green-700"
                            aria-label="-"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-7 text-center text-sm font-semibold text-pf-green-900">
                            {quantity}
                          </span>
                          <button
                            onClick={() => setQty(product.slug, quantity + 1)}
                            className="flex h-9 w-9 items-center justify-center text-pf-ink-soft hover:text-pf-green-700"
                            aria-label="+"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-lg font-semibold text-pf-green-700">
                            {brl(lineTotal)}
                          </div>
                          {quantity > 1 && (
                            <div className="text-xs text-pf-ink-soft">
                              {brl(product.price)} {t("cart.price").toLowerCase()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {bundles.length > 0 && (
              <ul className="mt-3 space-y-3">
                {bundles.map((b) => (
                  <li key={b.slug} className="flex items-center gap-4 rounded-2xl border-2 border-pf-green-700/20 bg-pf-green-50/40 p-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-pf-green-700 text-pf-cream">📦</span>
                    <div className="flex-1">
                      <p className="font-semibold text-pf-green-900">
                        {b.quantity}x {lang === "pt" ? "Kit" : "Bundle"} {b.name}
                      </p>
                      <p className="text-xs text-pf-ink-soft">{b.components.map((c) => `${c.quantity}x ${c.name}`).join(" + ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-pf-green-800">{brl(b.unitTotal * b.quantity)}</p>
                      <button onClick={() => removeBundle(b.slug)} className="text-xs text-pf-ink-soft hover:text-pf-clay">
                        {t("cart.remove")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex items-center justify-between">
              <Link
                href="/loja"
                className="text-sm font-medium text-pf-green-700 hover:underline"
              >
                ← {t("cart.continue")}
              </Link>
              <button
                onClick={clear}
                className="text-sm text-pf-ink-soft hover:text-pf-clay"
              >
                {t("cart.clear")}
              </button>
            </div>
          </div>

          {/* summary */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-pf-green-900/8 bg-white p-6">
              <h2 className="font-display text-lg font-semibold text-pf-green-900">
                {t("checkout.summary")}
              </h2>

              <div className="mt-4 flex items-center gap-2 rounded-xl bg-pf-cream-100 p-3 text-xs text-pf-ink-soft">
                <Truck size={15} className="shrink-0 text-pf-green-500" />
                {remaining > 0 ? (
                  <span>
                    {lang === "pt" ? "Faltam " : "Add "}
                    <b className="text-pf-green-700">{brl(remaining)}</b>
                    {lang === "pt"
                      ? " para o frete grátis"
                      : " more for free shipping"}
                  </span>
                ) : (
                  <span className="font-semibold text-pf-green-600">
                    🌿 {t("common.freeShipping")}!
                  </span>
                )}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-pf-green-900/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pf-green-500 to-pf-gold-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-pf-green-900/8 pt-5">
                <span className="text-pf-ink-soft">{t("cart.subtotal")}</span>
                <span className="font-display text-2xl font-semibold text-pf-green-900">
                  {brl(subtotal)}
                </span>
              </div>
              <p className="mt-1 text-xs text-pf-ink-soft/70">
                {t("cart.shippingNote")}
              </p>

              <CouponField />

              {discount > 0 && (
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-pf-green-700">
                    {t("cart.discount")} ({coupon?.code})
                  </span>
                  <span className="font-semibold text-pf-green-700">−{brl(discount)}</span>
                </div>
              )}

              <Link
                href="/loja/checkout"
                className="group mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-pf-green-700 px-6 py-3.5 text-sm font-semibold text-pf-cream transition-colors hover:bg-pf-green-600"
              >
                {t("cart.checkout")}
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
