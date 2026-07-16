import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Leaf,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import type { Lang } from "@/i18n";
import { tp, categoryName } from "@/data/catalog";
import { useProducts } from "@/context/ProductsContext";
import { useCart } from "@/context/CartContext";
import { Rating } from "@/components/ui/Rating";
import { brl } from "@/lib/utils";

export default function Hero() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.split("-")[0] as Lang) || "pt";
  const { add, open } = useCart();
  const { products } = useProducts();
  const HERO_PRODUCTS = useMemo(
    () =>
      products
        .filter((p) => p.hero)
        .sort((a, b) => (a.hero!.order ?? 0) - (b.hero!.order ?? 0)),
    [products]
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5500, stopOnInteraction: false }),
  ]);
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (emblaApi) setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  const trust = [
    { icon: Sprout, label: t("hero.trust.a") },
    { icon: ShieldCheck, label: t("hero.trust.b") },
    { icon: Leaf, label: t("hero.trust.c") },
  ];

  const accent = HERO_PRODUCTS[selected]?.hero?.accent ?? "#cdb59b";

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-pf-cream to-pf-cream-100">
      {/* organic blobs */}
      <div className="pointer-events-none absolute -right-24 top-10 h-[34rem] w-[34rem] rounded-full bg-pf-green-300/25 blur-[110px]" />
      <div className="pointer-events-none absolute -left-32 bottom-0 h-[28rem] w-[28rem] rounded-full bg-pf-gold-500/25 blur-[110px]" />
      {/* accent halo follows selected product */}
      <div
        className="pointer-events-none absolute right-[16%] top-1/2 h-[26rem] w-[26rem] -translate-y-1/2 rounded-full opacity-30 blur-[100px] transition-colors duration-700"
        style={{ background: accent }}
      />
      {/* botanical watermark (ícone da marca) */}
      <img
        src="/brand/icon.webp"
        alt=""
        aria-hidden
        className="pf-float pointer-events-none absolute -right-16 top-1/2 hidden h-[40rem] w-[40rem] -translate-y-1/2 object-contain opacity-[0.045] md:block"
      />

      <div className="container-pf relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {HERO_PRODUCTS.map((product) => {
              const text = tp(product, lang);
              const hasDiscount =
                product.compareAt && product.compareAt > product.price;
              return (
                <div
                  key={product.slug}
                  className="relative min-w-0 flex-[0_0_100%]"
                >
                  <div className="grid min-h-[100svh] items-center gap-8 pb-20 pt-28 md:grid-cols-2 md:gap-6">
                    {/* text */}
                    <div className="order-2 max-w-xl md:order-1">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pf-gold-600">
                        {categoryName(product.category, lang)}
                      </p>
                      <h1 className="mt-2 font-display text-4xl font-semibold leading-[1.05] text-pf-green-900 text-balance sm:text-5xl lg:text-6xl">
                        {text.name.split("—")[0].trim()}
                      </h1>
                      <p className="mt-4 max-w-md text-lg leading-relaxed text-pf-ink-soft text-pretty">
                        {text.tagline}
                      </p>

                      <div className="mt-6 flex items-center gap-4">
                        {product.reviews > 0 && (
                          <>
                            <Rating
                              value={product.rating}
                              reviews={product.reviews}
                            />
                            <span className="h-4 w-px bg-pf-green-900/15" />
                          </>
                        )}
                        <div className="flex items-baseline gap-2">
                          {hasDiscount && (
                            <span className="text-sm text-pf-ink-soft/70 line-through">
                              {brl(product.compareAt!)}
                            </span>
                          )}
                          <span className="font-display text-2xl font-semibold text-pf-green-700">
                            {brl(product.price)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-8 flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => {
                            add(product.slug, 1);
                            open();
                          }}
                          className="group inline-flex items-center gap-2 rounded-full bg-pf-green-700 px-7 py-3.5 text-sm font-semibold text-pf-cream shadow-sm transition-all hover:bg-pf-green-600 active:scale-95"
                        >
                          {t("common.buy")}
                          <ArrowRight
                            size={17}
                            className="transition-transform group-hover:translate-x-0.5"
                          />
                        </button>
                        <Link
                          href={`/loja/produto/${product.slug}`}
                          className="inline-flex items-center gap-2 rounded-full border border-pf-green-700/30 px-7 py-3.5 text-sm font-semibold text-pf-green-700 transition-colors hover:bg-pf-green-900/5"
                        >
                          {t("common.viewProduct")}
                        </Link>
                      </div>

                      <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2">
                        {trust.map(({ icon: Icon, label }) => (
                          <span
                            key={label}
                            className="inline-flex items-center gap-2 text-sm font-medium text-pf-ink-soft"
                          >
                            <Icon size={16} className="text-pf-green-500" />
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* product image */}
                    <div className="order-1 flex items-center justify-center md:order-2">
                      <div className="pf-float relative">
                        <div
                          className="absolute -inset-10 rounded-full opacity-40 blur-3xl transition-colors duration-700"
                          style={{ background: accent }}
                        />
                        <div className="relative overflow-hidden rounded-[2.5rem] border border-pf-border bg-white p-5 pf-shadow-card sm:p-7">
                          <div
                            className="pointer-events-none absolute inset-0 opacity-[0.10]"
                            style={{
                              background: `radial-gradient(circle at 50% 30%, ${accent}, transparent 65%)`,
                            }}
                          />
                          <img
                            src={product.image}
                            alt={text.name}
                            className="relative z-10 h-[15rem] w-[15rem] object-contain sm:h-[19rem] sm:w-[19rem] lg:h-[22rem] lg:w-[22rem]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* controls */}
        <div className="absolute inset-x-0 bottom-6 z-20 flex items-center justify-between md:bottom-8">
          <div className="flex gap-2">
            {HERO_PRODUCTS.map((p, i) => (
              <button
                key={p.slug}
                onClick={() => emblaApi?.scrollTo(i)}
                aria-label={`Slide ${i + 1}`}
                className="h-1.5 overflow-hidden rounded-full transition-all"
                style={{
                  width: i === selected ? 40 : 16,
                  background:
                    i === selected ? "var(--color-pf-green-700)" : "var(--color-pf-green-900)",
                  opacity: i === selected ? 1 : 0.18,
                }}
              />
            ))}
          </div>
          <div className="hidden gap-2 md:flex">
            <button
              onClick={() => emblaApi?.scrollPrev()}
              aria-label="Anterior"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-pf-green-900/15 text-pf-green-700 transition-colors hover:bg-pf-green-900/5"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              aria-label="Próximo"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-pf-green-900/15 text-pf-green-700 transition-colors hover:bg-pf-green-900/5"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
