import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowRight, Store } from "lucide-react";
import { FEATURED_PRODUCTS } from "@/data/catalog";
import ProductCard from "@/components/store/ProductCard";
import { Eyebrow, Reveal } from "@/components/ui/Reveal";

export default function FeaturedStore() {
  const { t } = useTranslation();

  return (
    <section id="store" className="bg-pf-cream-100 py-20 md:py-28">
      <div className="container-pf">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow className="justify-center">
            {t("store.featuredEyebrow")}
          </Eyebrow>
          <h2 className="mt-4 font-display text-3xl font-semibold text-pf-green-900 text-balance md:text-4xl">
            {t("store.featuredTitle")}
          </h2>
          <p className="mt-4 text-pf-ink-soft text-pretty">
            {t("store.featuredSubtitle")}
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          {FEATURED_PRODUCTS.map((p, i) => (
            <Reveal key={p.slug} delay={(i % 4) * 0.06}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12 flex justify-center">
          <Link
            href="/loja"
            className="group inline-flex items-center gap-2.5 rounded-full bg-pf-green-700 px-8 py-4 text-sm font-semibold text-pf-cream shadow-lg transition-all hover:bg-pf-green-600 active:scale-[0.98]"
          >
            <Store size={17} />
            {t("common.seeStore")}
            <ArrowRight
              size={17}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
