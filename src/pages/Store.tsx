import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { Lang } from "@/i18n";
import {
  CATEGORIES,
  PRODUCTS,
  tp,
  type CategoryId,
  type Product,
} from "@/data/catalog";
import ProductCard from "@/components/store/ProductCard";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

type Sort = "featured" | "priceAsc" | "priceDesc" | "az";

export default function Store() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.split("-")[0] as Lang) || "pt";
  const search = useSearch();

  const initialCat = useMemo(() => {
    const p = new URLSearchParams(search).get("cat");
    return (CATEGORIES.some((c) => c.id === p) ? p : "") as CategoryId | "";
  }, [search]);

  const [cat, setCat] = useState<CategoryId | "">(initialCat);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("featured");

  useEffect(() => setCat(initialCat), [initialCat]);
  useEffect(() => {
    document.title = `${t("store.pageTitle")} — PuraFlora`;
  }, [t]);

  const products = useMemo(() => {
    let list: Product[] = PRODUCTS.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const txt = tp(p, lang);
        const hay = `${txt.name} ${txt.tagline} ${txt.composition.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sort === "priceAsc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "priceDesc")
      list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === "az")
      list = [...list].sort((a, b) =>
        tp(a, lang).name.localeCompare(tp(b, lang).name)
      );

    return list;
  }, [cat, query, sort, lang]);

  return (
    <div className="bg-pf-cream">
      {/* header band */}
      <div className="pf-grain relative overflow-hidden bg-pf-green-800 pb-10 pt-28 text-pf-cream md:pt-32">
        <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-pf-gold-500/12 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-pf-green-500/25 blur-3xl" />
        <div className="container-pf relative">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-pf-gold-300">
            {t("store.featuredEyebrow")}
          </span>
          <h1 className="mt-3 font-display text-4xl font-semibold text-pf-cream md:text-5xl">
            {t("store.pageTitle")}
          </h1>
          <p className="mt-3 max-w-lg text-pf-cream/75">
            {t("store.pageSubtitle")}
          </p>
        </div>
      </div>

      <div className="container-pf py-10">
        {/* toolbar */}
        <div className="mb-8 flex flex-col gap-4">
          {/* category pills */}
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <Pill active={cat === ""} onClick={() => setCat("")}>
              {t("store.all")}
            </Pill>
            {CATEGORIES.map((c) => (
              <Pill
                key={c.id}
                active={cat === c.id}
                onClick={() => setCat(c.id)}
              >
                {c.name[lang]}
              </Pill>
            ))}
          </div>

          {/* search + sort */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pf-ink-soft"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("store.searchPlaceholder")}
                className="w-full rounded-full border border-pf-green-900/12 bg-white py-3 pl-11 pr-10 text-base text-pf-ink outline-none transition-colors focus:border-pf-green-400"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-pf-ink-soft hover:text-pf-green-700"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="text-base text-pf-ink-soft">
                {t(products.length === 1 ? "store.results_one" : "store.results_other", {
                  count: products.length,
                })}
              </span>
              <div className="relative">
                <SlidersHorizontal
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pf-ink-soft"
                />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="appearance-none rounded-full border border-pf-green-900/12 bg-white py-3 pl-10 pr-8 text-[15px] font-semibold text-pf-ink outline-none focus:border-pf-green-400"
                >
                  <option value="featured">{t("store.sort.featured")}</option>
                  <option value="priceAsc">{t("store.sort.priceAsc")}</option>
                  <option value="priceDesc">{t("store.sort.priceDesc")}</option>
                  <option value="az">{t("store.sort.az")}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* grid */}
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <p className="font-display text-xl text-pf-green-900">
              {t("store.noResults")}
            </p>
            <button
              onClick={() => {
                setQuery("");
                setCat("");
                setSort("featured");
              }}
              className="rounded-full border border-pf-green-700/25 px-5 py-2.5 text-sm font-semibold text-pf-green-700 hover:bg-pf-green-700 hover:text-pf-cream"
            >
              {t("store.clear")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
            {products.map((p, i) => (
              <Reveal key={p.slug} delay={(i % 4) * 0.05} y={16}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-5 py-2.5 text-[15px] font-semibold transition-colors",
        active
          ? "border-pf-green-700 bg-pf-green-700 text-pf-cream"
          : "border-pf-green-900/12 bg-white text-pf-ink-soft hover:border-pf-green-300 hover:text-pf-green-700"
      )}
    >
      {children}
    </button>
  );
}
