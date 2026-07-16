import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Leaf,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import type { Lang } from "@/i18n";
import { categoryName, tp } from "@/data/catalog";
import { useProducts } from "@/context/ProductsContext";
import { useCart } from "@/context/CartContext";
import { Rating } from "@/components/ui/Rating";
import ProductCard from "@/components/store/ProductCard";
import ReviewsSection from "@/components/store/ReviewsSection";
import BundleOffer, { type ApiBundle } from "@/components/store/BundleOffer";
import { Reveal } from "@/components/ui/Reveal";
import { brl } from "@/lib/utils";
import { trackViewItem, useAnalyticsReady } from "@/lib/analytics";

export default function ProductDetail() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.split("-")[0] as Lang) || "pt";
  const params = useParams();
  const [, setLocation] = useLocation();
  const { add, open } = useCart();
  const { products: PRODUCTS } = useProducts();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [apiBundles, setApiBundles] = useState<ApiBundle[]>([]);
  const analyticsOn = useAnalyticsReady();

  const product = PRODUCTS.find((p) => p.slug === (params.slug ?? ""));

  // Kits que contêm este produto (para "compre junto")
  useEffect(() => {
    const slug = params.slug;
    if (!slug) return;
    fetch(`/api/store/products/${slug}/related`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setApiBundles(d?.bundles ?? []))
      .catch(() => setApiBundles([]));
  }, [params.slug]);

  useEffect(() => {
    setQty(1);
    if (product) document.title = `${tp(product, lang).name} — PuraFlora`;
  }, [params.slug, lang, product]);

  // Analytics: view_item ao abrir a página do produto. Depende de `analyticsOn`
  // para reemitir caso o consentimento chegue depois da montagem (no-op protege
  // contra duplicidade só não vale aqui — mas trackViewItem só emite com ready).
  useEffect(() => {
    if (product && analyticsOn) {
      trackViewItem({ slug: product.slug, name: tp(product, lang).name, price: product.price, category: String(product.category ?? "") });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug, product?.slug, analyticsOn]);

  if (!product) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 bg-pf-cream px-4 text-center">
        <p className="font-display text-2xl text-pf-green-900">
          {t("store.noResults")}
        </p>
        <Link
          href="/loja"
          className="rounded-full bg-pf-green-700 px-6 py-3 text-sm font-semibold text-pf-cream hover:bg-pf-green-600"
        >
          {t("product.back")}
        </Link>
      </div>
    );
  }

  const text = tp(product, lang);
  const hasDiscount = product.compareAt && product.compareAt > product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / product.compareAt!) * 100)
    : 0;
  const accent = product.hero?.accent ?? "#cdb59b";

  const related = PRODUCTS.filter(
    (p) => p.category === product.category && p.slug !== product.slug
  ).slice(0, 4);

  const handleAdd = () => {
    add(product.slug, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  };
  const handleBuy = () => {
    add(product.slug, qty);
    setLocation("/loja/checkout");
  };

  const trust = [
    { icon: Truck, label: t("common.freeShipping") },
    { icon: Leaf, label: t("common.natural") },
    { icon: ShieldCheck, label: t("common.glutenFree") },
  ];

  return (
    <div className="bg-pf-cream pb-20 pt-24 md:pt-28">
      <div className="container-pf">
        {/* breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-pf-ink-soft">
          <Link href="/loja" className="hover:text-pf-green-700">
            {t("nav.store")}
          </Link>
          <ChevronRight size={14} />
          <span className="text-pf-green-700">
            {categoryName(product.category, lang)}
          </span>
        </nav>

        <Link
          href="/loja"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-pf-green-700 hover:underline"
        >
          <ArrowLeft size={15} /> {t("product.back")}
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* image */}
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-pf-green-900/8 bg-white">
              <div
                className="pointer-events-none absolute inset-0 opacity-15"
                style={{
                  background: `radial-gradient(circle at 50% 40%, ${accent}, transparent 62%)`,
                }}
              />
              {hasDiscount && (
                <span className="absolute left-5 top-5 z-10 rounded-full bg-pf-gold-500 px-3 py-1 text-sm font-bold text-pf-green-900 shadow">
                  -{discountPct}%
                </span>
              )}
              <img
                src={product.image}
                alt={text.name}
                className="relative mx-auto aspect-square w-full max-w-md object-contain p-8"
              />
            </div>
          </Reveal>

          {/* info */}
          <Reveal delay={0.08}>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-pf-green-500">
              {categoryName(product.category, lang)}
            </span>
            <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-pf-green-900 md:text-4xl">
              {text.name}
            </h1>
            <p className="mt-3 text-lg text-pf-ink-soft">{text.tagline}</p>

            <div className="mt-4 flex items-center gap-4">
              <Rating value={product.rating} reviews={product.reviews} size={16} />
              <span className="text-sm text-pf-ink-soft">{product.reviews > 0 ? "· " : ""}{text.size}</span>
            </div>

            <div className="mt-6 flex items-end gap-3">
              {hasDiscount && (
                <span className="text-lg text-pf-ink-soft/70 line-through">
                  {brl(product.compareAt!)}
                </span>
              )}
              <span className="font-display text-4xl font-semibold text-pf-green-700">
                {brl(product.price)}
              </span>
            </div>

            <p className="mt-5 leading-relaxed text-pf-ink">{text.description}</p>

            {/* qty + actions */}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-full border border-pf-green-900/15 bg-white">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-12 w-12 items-center justify-center text-pf-ink-soft hover:text-pf-green-700"
                  aria-label="-"
                >
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center font-display text-lg font-semibold text-pf-green-900">
                  {qty}
                </span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="flex h-12 w-12 items-center justify-center text-pf-ink-soft hover:text-pf-green-700"
                  aria-label="+"
                >
                  <Plus size={16} />
                </button>
              </div>

              <button
                onClick={handleAdd}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-pf-green-700 px-6 text-sm font-semibold text-pf-green-700 transition-colors hover:bg-pf-green-700 hover:text-pf-cream"
              >
                {added ? <Check size={18} /> : <ShoppingBag size={18} />}
                {added ? t("common.added") : t("product.addToCart")}
              </button>
              <button
                onClick={handleBuy}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-pf-gold-500 px-6 text-sm font-semibold text-pf-green-900 transition-colors hover:bg-pf-gold-400"
              >
                {t("product.buyNow")}
              </button>
            </div>

            {/* trust row */}
            <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl border border-pf-green-900/8 bg-white p-4">
              {trust.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1.5 text-center"
                >
                  <Icon size={18} className="text-pf-green-600" />
                  <span className="text-xs font-medium text-pf-ink-soft">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* details grid */}
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          <InfoCard title={t("product.highlights")}>
            <ul className="space-y-2.5">
              {text.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2.5 text-sm text-pf-ink">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pf-green-100 text-pf-green-600">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {h}
                </li>
              ))}
            </ul>
          </InfoCard>

          <InfoCard title={t("product.composition")}>
            <ul className="flex flex-wrap gap-2">
              {text.composition.map((c) => (
                <li
                  key={c}
                  className="rounded-full bg-pf-cream-100 px-3 py-1.5 text-xs font-medium text-pf-green-800"
                >
                  {c}
                </li>
              ))}
            </ul>
          </InfoCard>

          <InfoCard title={t("product.usage")}>
            <p className="text-sm leading-relaxed text-pf-ink">{text.usage}</p>
            <div className="mt-4 border-t border-pf-green-900/8 pt-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-pf-green-500">
                {t("product.indication")}
              </span>
              <p className="mt-1 text-sm text-pf-ink-soft">{text.indication}</p>
            </div>
          </InfoCard>
        </div>

        <p className="mt-6 text-xs text-pf-ink-soft/70">
          {t("product.notMedicine")}
        </p>

        {/* compre junto (kits) */}
        {apiBundles.map((b) => (
          <BundleOffer key={b.id} bundle={b} />
        ))}

        {/* avaliações */}
        <ReviewsSection slug={product.slug} />

        {/* SEO: AggregateRating só quando há avaliações reais (guideline do Google) */}
        {product.reviews > 0 && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                name: text.name,
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: product.rating,
                  reviewCount: product.reviews,
                },
              }),
            }}
          />
        )}

        {/* related */}
        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-6 font-display text-2xl font-semibold text-pf-green-900">
              {t("product.related")}
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-5">
              {related.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-pf-green-900/8 bg-white p-6">
      <h3 className="mb-4 font-display text-lg font-semibold text-pf-green-900">
        {title}
      </h3>
      {children}
    </div>
  );
}
