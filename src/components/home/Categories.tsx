import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowUpRight,
  Droplets,
  Flame,
  HeartPulse,
  Leaf,
  Shield,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { Lang } from "@/i18n";
import { CATEGORIES } from "@/data/catalog";
import { Eyebrow, Reveal } from "@/components/ui/Reveal";

const ICONS: Record<string, LucideIcon> = {
  shield: Shield,
  sparkles: Sparkles,
  flame: Flame,
  leaf: Leaf,
  droplets: Droplets,
  heart: HeartPulse,
};

export default function Categories() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.split("-")[0] as Lang) || "pt";

  return (
    <section id="categories" className="bg-pf-cream-100 py-20 md:py-28">
      <div className="container-pf">
        <Reveal className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl">
            <Eyebrow>{t("categories.eyebrow")}</Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-semibold text-pf-green-900 text-balance md:text-4xl">
              {t("categories.title")}
            </h2>
            <p className="mt-3 text-pf-ink-soft">{t("categories.subtitle")}</p>
          </div>
          <Link
            href="/loja"
            className="inline-flex items-center gap-2 rounded-full border border-pf-green-700/25 px-5 py-2.5 text-sm font-semibold text-pf-green-700 transition-colors hover:bg-pf-green-700 hover:text-pf-cream"
          >
            {t("common.seeStore")}
            <ArrowUpRight size={16} />
          </Link>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat, i) => {
            const Icon = ICONS[cat.icon] ?? Leaf;
            return (
              <Reveal key={cat.id} delay={(i % 3) * 0.07}>
                <Link
                  href={`/loja?cat=${cat.id}`}
                  className="group relative flex h-full items-start gap-4 overflow-hidden rounded-2xl border border-pf-green-900/8 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:pf-shadow-card"
                >
                  <span
                    className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
                    style={{ background: cat.accent }}
                  />
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ background: cat.accent }}
                  >
                    <Icon size={22} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-1.5 font-display text-lg font-semibold text-pf-green-900">
                      {cat.name[lang]}
                      <ArrowUpRight
                        size={16}
                        className="text-pf-green-400 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                      />
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-pf-ink-soft">
                      {cat.blurb[lang]}
                    </p>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
