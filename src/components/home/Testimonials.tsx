import { useTranslation } from "react-i18next";
import { Quote, Star } from "lucide-react";
import { Eyebrow, Reveal } from "@/components/ui/Reveal";

export default function Testimonials() {
  const { t } = useTranslation();
  const items = t("testimonials.items", { returnObjects: true }) as {
    quote: string;
    author: string;
    role: string;
  }[];

  return (
    <section className="bg-pf-green-800 py-20 text-pf-cream md:py-28 pf-grain relative overflow-hidden">
      <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-pf-gold-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-pf-green-500/20 blur-3xl" />
      <div className="container-pf relative">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow className="justify-center text-pf-gold-300 [&_span]:bg-pf-gold-300/40">
            {t("testimonials.eyebrow")}
          </Eyebrow>
          <h2 className="mt-4 font-display text-3xl font-semibold text-pf-cream text-balance md:text-4xl">
            {t("testimonials.title")}
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {items.map((item, i) => (
            <Reveal key={item.author} delay={i * 0.1}>
              <figure className="flex h-full flex-col rounded-2xl border border-pf-cream/12 bg-pf-cream/5 p-7 backdrop-blur">
                <Quote size={26} className="text-pf-gold-300" />
                <div className="mt-3 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star
                      key={s}
                      size={14}
                      className="text-pf-gold-400"
                      fill="currentColor"
                    />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-[0.98rem] leading-relaxed text-pf-cream/85">
                  “{item.quote}”
                </blockquote>
                <figcaption className="mt-6 border-t border-pf-cream/12 pt-4">
                  <div className="font-display font-semibold text-pf-cream">
                    {item.author}
                  </div>
                  <div className="text-sm text-pf-cream/55">{item.role}</div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
