import { useTranslation } from "react-i18next";
import { Check, Quote, ShieldCheck } from "lucide-react";
import { Eyebrow, Reveal } from "@/components/ui/Reveal";

function SealBadge({ className }: { className?: string }) {
  const { t } = useTranslation();
  const ring = `${t("beto.seal.badge")} · Beto Munhoz · `.toUpperCase();
  return (
    <div className={className}>
      <svg viewBox="0 0 120 120" className="h-full w-full drop-shadow-lg">
        <defs>
          <path
            id="seal-ring"
            fill="none"
            d="M60 16 A44 44 0 1 1 59.99 16"
          />
        </defs>
        <circle cx="60" cy="60" r="59" fill="#3f5242" />
        <circle
          cx="60"
          cy="60"
          r="47"
          fill="#fffcf7"
          stroke="#cdb59b"
          strokeWidth="1.5"
        />
        <text
          fill="#e3d6c4"
          fontSize="7.4"
          fontWeight="700"
          letterSpacing="1.4"
          fontFamily="Inter, sans-serif"
        >
          <textPath href="#seal-ring" startOffset="0">
            {ring}
          </textPath>
        </text>
        <g transform="translate(60 54)">
          <path
            d="M-14 2 l9 9 l18 -20"
            fill="none"
            stroke="#3f5242"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <text
          x="60"
          y="82"
          textAnchor="middle"
          fill="#5f7261"
          fontSize="7"
          fontWeight="600"
          letterSpacing="1"
          fontFamily="Inter, sans-serif"
        >
          {t("common.natural").toUpperCase()}
        </text>
      </svg>
    </div>
  );
}

export default function QualitySeal() {
  const { t } = useTranslation();
  const principles = t("beto.seal.principles", {
    returnObjects: true,
  }) as string[];

  return (
    <section id="selo" className="bg-pf-cream-100 py-20 md:py-28">
      <div className="container-pf">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* photo + seal */}
          <Reveal className="order-2 lg:order-1">
            <div className="relative mx-auto max-w-sm">
              <div className="absolute -inset-3 rotate-2 rounded-[3rem] bg-pf-green-100" />
              <img
                src="/beto/beto-naturopata.webp"
                alt="Beto Munhoz — Naturopata"
                className="relative aspect-[4/5] w-full rounded-[2.5rem] object-cover object-top ring-1 ring-pf-border pf-shadow-card"
                loading="lazy"
              />
              <SealBadge className="absolute -right-5 -top-6 h-28 w-28 sm:h-32 sm:w-32" />
            </div>
          </Reveal>

          {/* text */}
          <Reveal delay={0.1} className="order-1 lg:order-2">
            <Eyebrow>
              <ShieldCheck size={14} className="text-pf-green-600" />
              {t("beto.seal.eyebrow")}
            </Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight text-pf-green-900 text-balance md:text-4xl">
              {t("beto.seal.title")}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-pf-ink-soft text-pretty">
              {t("beto.seal.intro")}
            </p>

            <ul className="mt-6 space-y-3">
              {principles.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pf-green-700 text-pf-cream">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span className="text-base text-pf-ink">{p}</span>
                </li>
              ))}
            </ul>

            <figure className="mt-8 rounded-2xl border border-pf-border bg-white p-6">
              <Quote size={24} className="text-pf-gold-500" />
              <blockquote className="mt-2 font-display text-lg italic leading-snug text-pf-green-800">
                {t("beto.seal.quote")}
              </blockquote>
              <figcaption className="mt-3 text-sm font-semibold text-pf-green-600">
                — {t("beto.seal.author")}
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
