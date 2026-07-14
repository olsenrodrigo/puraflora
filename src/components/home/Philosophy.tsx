import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { GlowLogo } from "@/components/brand/Logo";
import { Eyebrow, Reveal } from "@/components/ui/Reveal";

export default function Philosophy() {
  const { t } = useTranslation();
  const points = t("philosophy.points", { returnObjects: true }) as string[];

  const stats = [
    { value: "19", label: t("nav.store") },
    { value: "100%", label: t("common.natural") },
    { value: "0", label: t("common.glutenFree") },
  ];

  return (
    <section id="philosophy" className="bg-pf-cream py-20 md:py-28">
      <div className="container-pf">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* brand panel */}
          <Reveal className="order-2 lg:order-1">
            <div className="pf-grain relative overflow-hidden rounded-3xl bg-pf-green-800 p-8 text-pf-cream sm:p-12">
              <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-pf-green-500/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-pf-gold-500/15 blur-3xl" />

              <div className="relative">
                <GlowLogo tone="light" glow="#95a48e" className="h-24 w-24" />
                <p className="mt-6 max-w-sm font-display text-2xl leading-snug text-pf-cream text-balance">
                  {t("brand.tagline")}
                </p>

                <div className="mt-10 grid grid-cols-3 gap-4 border-t border-pf-cream/15 pt-8">
                  {stats.map((s) => (
                    <div key={s.label}>
                      <div className="font-display text-3xl font-semibold text-pf-gold-300">
                        {s.value}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-wide text-pf-cream/60">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* text */}
          <Reveal delay={0.1} className="order-1 lg:order-2">
            <Eyebrow>{t("philosophy.eyebrow")}</Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight text-pf-green-900 text-balance md:text-4xl">
              {t("philosophy.title")}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-pf-ink-soft text-pretty">
              {t("philosophy.body")}
            </p>

            <ul className="mt-7 space-y-3">
              {points.map((p) => (
                <li key={p} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pf-green-100 text-pf-green-600">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span className="text-pf-ink">{p}</span>
                </li>
              ))}
            </ul>

            <p className="mt-8 font-display text-lg italic text-pf-green-600">
              {t("philosophy.signature")}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
