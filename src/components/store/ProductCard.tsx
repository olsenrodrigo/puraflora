import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Check, ShoppingBag } from "lucide-react";
import type { Lang } from "@/i18n";
import { categoryName, tp, type Product } from "@/data/catalog";
import { useCart } from "@/context/CartContext";
import { Rating } from "@/components/ui/Rating";
import { brl, cn } from "@/lib/utils";

export default function ProductCard({ product }: { product: Product }) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.split("-")[0] as Lang) || "pt";
  const { add, lastAdded } = useCart();
  const text = tp(product, lang);

  const hasDiscount = product.compareAt && product.compareAt > product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / product.compareAt!) * 100)
    : 0;
  const justAdded = lastAdded === product.slug;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-pf-green-900/8 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-pf-green-200 hover:pf-shadow-card">
      <Link
        href={`/loja/produto/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-gradient-to-b from-pf-cream-100 to-white"
      >
        <img
          src={product.image}
          alt={text.name}
          loading="lazy"
          className="h-full w-full object-contain p-4 transition-transform duration-500 ease-out group-hover:scale-[1.06]"
        />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {hasDiscount && (
            <span className="rounded-full bg-pf-gold-500 px-2 py-0.5 text-[11px] font-bold text-pf-green-900 shadow-sm">
              -{discountPct}%
            </span>
          )}
          {product.badge === "bestSeller" && (
            <span className="rounded-full bg-pf-green-700 px-2 py-0.5 text-[11px] font-semibold text-pf-cream shadow-sm">
              {t("common.bestSeller")}
            </span>
          )}
          {product.badge === "new" && (
            <span className="rounded-full bg-pf-green-300 px-2 py-0.5 text-[11px] font-semibold text-pf-green-900 shadow-sm">
              {t("common.new")}
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4 md:p-5">
        <span className="text-xs font-semibold uppercase tracking-wider text-pf-green-500">
          {categoryName(product.category, lang)}
        </span>
        <Link href={`/loja/produto/${product.slug}`} className="mt-1.5">
          <h3 className="line-clamp-2 min-h-[3rem] font-display text-lg font-semibold leading-snug text-pf-green-900 transition-colors hover:text-pf-green-600">
            {text.name}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-1 text-sm text-pf-ink-soft">{text.size}</p>

        <div className="mt-2.5">
          <Rating value={product.rating} reviews={product.reviews} size={16} />
        </div>

        <div className="mt-auto pt-4">
          <div className="mb-3 flex items-baseline gap-2">
            {hasDiscount && (
              <span className="text-sm text-pf-ink-soft/70 line-through">
                {brl(product.compareAt!)}
              </span>
            )}
            <span className="font-display text-2xl font-semibold text-pf-green-700">
              {brl(product.price)}
            </span>
          </div>
          <button
            onClick={() => add(product.slug, 1)}
            className={cn(
              "flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-3 text-[15px] font-semibold text-pf-cream shadow-sm transition-all active:scale-[0.98]",
              justAdded
                ? "bg-pf-green-500"
                : "bg-pf-green-700 hover:bg-pf-green-600"
            )}
          >
            {justAdded ? (
              <>
                <Check size={19} /> {t("common.addedShort")}
              </>
            ) : (
              <>
                <ShoppingBag size={18} /> {t("common.addToCart")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
