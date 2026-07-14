import { useTranslation } from "react-i18next";
import { Droplet, FlaskConical, HeartHandshake, Sprout } from "lucide-react";
import { Eyebrow, Reveal } from "@/components/ui/Reveal";

const ICONS = [Droplet, Sprout, FlaskConical, HeartHandshake];

export default function ValueProps() {
  const { t } = useTranslation();
  const items = t("value.items", { returnObjects: true }) as {
    title: string;
    desc: string;
  }[];

  return (
    <section id="benefits" className="bg-pf-cream py-20 md:py-28">
      <div className="container-pf">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow className="justify-center">{t("value.eyebrow")}</Eyebrow>
          <h2 className="mt-4 font-display text-3xl font-semibold text-pf-green-900 text-balance md:text-4xl">
            {t("value.title")}
          </h2>
          <p className="mt-4 text-pf-ink-soft text-pretty">
            {t("value.subtitle")}
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => {
            const Icon = ICONS[i] ?? Sprout;
            return (
              <Reveal key={item.title} delay={i * 0.08}>
                <div className="group h-full rounded-2xl border border-pf-green-900/8 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-pf-green-200 hover:pf-shadow-card">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pf-green-100 text-pf-green-600 transition-colors group-hover:bg-pf-green-700 group-hover:text-pf-cream">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-5 font-display text-lg font-semibold text-pf-green-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-pf-ink-soft">
                    {item.desc}
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
