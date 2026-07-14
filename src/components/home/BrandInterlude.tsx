import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Eyebrow, Reveal } from "@/components/ui/Reveal";

export default function BrandInterlude() {
  const { t } = useTranslation();
  return (
    <section className="bg-pf-cream-100 py-20 md:py-28">
      <div className="container-pf">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Eyebrow className="justify-center">{t("hero.eyebrow")}</Eyebrow>

          <div className="mx-auto mt-8 overflow-hidden rounded-[2rem] bg-pf-cream ring-1 ring-pf-border pf-shadow-card">
            <video
              className="h-auto w-full"
              src="/media/shimmer.mp4"
              poster="/media/shimmer-poster.webp"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="PuraFlora"
            />
          </div>

          <h2 className="mx-auto mt-8 max-w-2xl font-display text-3xl font-semibold leading-snug text-pf-green-900 text-balance md:text-4xl">
            {t("brand.tagline")}
          </h2>

          <Link
            href="/loja"
            className="group mt-7 inline-flex items-center gap-2.5 rounded-full bg-pf-green-700 px-8 py-4 text-base font-semibold text-pf-cream shadow-sm transition-all hover:bg-pf-green-600 active:scale-[0.98]"
          >
            {t("common.seeStore")}
            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
