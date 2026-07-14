import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, Truck, X } from "lucide-react";
import type { Lang } from "@/i18n";
import { tp, FREE_SHIPPING_THRESHOLD } from "@/data/catalog";
import { useCart } from "@/context/CartContext";
import { brl } from "@/lib/utils";

export default function CartDrawer() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.split("-")[0] as Lang) || "pt";
  const { isOpen, close, lines, subtotal, setQty, remove, itemCount } =
    useCart();
  const [location] = useLocation();

  // fecha o carrinho ao navegar para qualquer rota
  useEffect(() => {
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            className="absolute inset-0 bg-pf-green-900/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.aside
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-pf-cream shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-pf-green-900/8 px-5 py-4">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-pf-green-900">
                <ShoppingBag size={18} className="text-pf-green-600" />
                {t("cart.title")}
                {itemCount > 0 && (
                  <span className="text-sm font-normal text-pf-ink-soft">
                    ({itemCount})
                  </span>
                )}
              </h2>
              <button
                onClick={close}
                className="flex h-9 w-9 items-center justify-center rounded-full text-pf-ink-soft hover:bg-pf-green-900/5"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pf-green-100">
                  <ShoppingBag size={26} className="text-pf-green-500" />
                </div>
                <div>
                  <p className="font-display text-lg font-semibold text-pf-green-900">
                    {t("cart.empty")}
                  </p>
                  <p className="mt-1 text-sm text-pf-ink-soft">
                    {t("cart.emptySub")}
                  </p>
                </div>
                <Link
                  href="/loja"
                  onClick={close}
                  className="rounded-full bg-pf-green-700 px-6 py-3 text-sm font-semibold text-pf-cream transition-colors hover:bg-pf-green-600"
                >
                  {t("cart.emptyCta")}
                </Link>
              </div>
            ) : (
              <>
                {/* free shipping bar */}
                <div className="px-5 py-3">
                  <div className="flex items-center gap-2 text-xs text-pf-ink-soft">
                    <Truck size={14} className="text-pf-green-500" />
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
                </div>

                {/* items */}
                <div className="flex-1 overflow-y-auto px-5 py-2">
                  <ul className="space-y-3">
                    {lines.map(({ product, quantity, lineTotal }) => {
                      const text = tp(product, lang);
                      return (
                        <li
                          key={product.slug}
                          className="flex gap-3 rounded-2xl border border-pf-green-900/8 bg-white p-3"
                        >
                          <Link
                            href={`/loja/produto/${product.slug}`}
                            onClick={close}
                            className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-pf-cream-100"
                          >
                            <img
                              src={product.image}
                              alt={text.name}
                              className="h-full w-full object-contain p-1.5"
                            />
                          </Link>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="line-clamp-2 text-sm font-semibold text-pf-green-900">
                                {text.name}
                              </h3>
                              <button
                                onClick={() => remove(product.slug)}
                                className="shrink-0 text-pf-ink-soft/60 hover:text-pf-clay"
                                aria-label={t("cart.remove")}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                            <div className="mt-auto flex items-center justify-between pt-2">
                              <div className="flex items-center rounded-full border border-pf-green-900/12">
                                <button
                                  onClick={() =>
                                    setQty(product.slug, quantity - 1)
                                  }
                                  className="flex h-7 w-7 items-center justify-center text-pf-ink-soft hover:text-pf-green-700"
                                  aria-label="-"
                                >
                                  <Minus size={13} />
                                </button>
                                <span className="w-6 text-center text-sm font-semibold text-pf-green-900">
                                  {quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    setQty(product.slug, quantity + 1)
                                  }
                                  className="flex h-7 w-7 items-center justify-center text-pf-ink-soft hover:text-pf-green-700"
                                  aria-label="+"
                                >
                                  <Plus size={13} />
                                </button>
                              </div>
                              <span className="font-display text-sm font-semibold text-pf-green-700">
                                {brl(lineTotal)}
                              </span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* footer */}
                <div className="border-t border-pf-green-900/8 bg-white px-5 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-pf-ink-soft">
                      {t("cart.subtotal")}
                    </span>
                    <span className="font-display text-xl font-semibold text-pf-green-900">
                      {brl(subtotal)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/loja/checkout"
                      onClick={close}
                      className="w-full rounded-full bg-pf-green-700 px-6 py-3.5 text-center text-sm font-semibold text-pf-cream transition-colors hover:bg-pf-green-600"
                    >
                      {t("cart.checkout")}
                    </Link>
                    <Link
                      href="/loja/carrinho"
                      onClick={close}
                      className="w-full rounded-full px-6 py-2.5 text-center text-sm font-medium text-pf-green-700 hover:underline"
                    >
                      {t("cart.title")}
                    </Link>
                  </div>
                  <p className="mt-2 text-center text-[11px] text-pf-ink-soft/70">
                    {t("cart.shippingNote")}
                  </p>
                </div>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
