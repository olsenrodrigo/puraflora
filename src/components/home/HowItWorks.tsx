import { useTranslation } from "react-i18next";
import { Leaf, PackageCheck, Sparkles, type LucideIcon } from "lucide-react";
import { Eyebrow, Reveal } from "@/components/ui/Reveal";

const ICONS: LucideIcon[] = [Leaf, PackageCheck, Sparkles];

export default function HowItWorks() {
  const { t } = useTranslation();
  const steps = t("how.steps", { returnObjects: true }) as {
    title: string;
    desc: string;
  }[];

  return (
    <section id="how" className="bg-pf-cream py-20 md:py-28">
      <div className="container-pf">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow className="justify-center">{t("how.eyebrow")}</Eyebrow>
          <h2 className="mt-4 font-display text-3xl font-semibold text-pf-green-900 text-balance md:text-4xl">
            {t("how.title")}
          </h2>
        </Reveal>

        <div className="relative mt-14 grid gap-8 md:grid-cols-3">
          {/* connecting line */}
          <div className="pointer-events-none absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-pf-green-200 to-transparent md:block" />

          {steps.map((step, i) => {
            const Icon = ICONS[i] ?? Leaf;
            return (
              <Reveal key={step.title} delay={i * 0.1} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-pf-green-200 bg-white text-pf-green-600 pf-shadow-soft">
                    <Icon size={26} />
                    <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-pf-gold-500 font-display text-xs font-bold text-pf-green-900">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-6 font-display text-xl font-semibold text-pf-green-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-pf-ink-soft">
                    {step.desc}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
