import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Instagram, Sprout } from "lucide-react";
import type { Lang } from "@/i18n";
import { Eyebrow, Reveal } from "@/components/ui/Reveal";
import { KwaiIcon, TikTokIcon } from "@/components/icons/Social";

interface Social {
  platform: string;
  handle: string;
  url: string;
  pt: string;
  en: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
}

const SOCIALS: Social[] = [
  {
    platform: "Instagram",
    handle: "@betomunhoznaturopata",
    url: "https://www.instagram.com/betomunhoznaturopata",
    pt: "240 mil",
    en: "240k",
    Icon: Instagram,
  },
  {
    platform: "TikTok",
    handle: "@betomunhozrp",
    url: "https://www.tiktok.com/@betomunhozrp",
    pt: "350 mil",
    en: "350k",
    Icon: TikTokIcon,
  },
  {
    platform: "Kwai",
    handle: "@beto_munhoz",
    url: "https://www.kwai.com/@beto_munhoz",
    pt: "488 mil",
    en: "488k",
    Icon: KwaiIcon,
  },
];

export default function BetoMunhoz() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.split("-")[0] as Lang) || "pt";

  return (
    <section id="beto" className="bg-pf-cream py-20 md:py-28">
      <div className="container-pf">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* photo */}
          <Reveal className="order-1">
            <div className="relative mx-auto max-w-md">
              <div className="absolute -inset-3 -rotate-2 rounded-[3rem] bg-pf-green-100" />
              <div className="absolute -bottom-5 -right-4 h-40 w-40 rounded-full bg-pf-gold-500/20 blur-2xl" />
              <img
                src="/beto/beto-retrato.webp"
                alt="Beto Munhoz"
                className="relative aspect-square w-full rounded-[2.5rem] object-cover object-top ring-1 ring-pf-border pf-shadow-card"
                loading="lazy"
              />
              <div className="absolute -bottom-4 left-5 flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 pf-shadow-card">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pf-green-700 text-pf-cream">
                  <Sprout size={18} />
                </span>
                <div>
                  <div className="font-display text-sm font-semibold leading-tight text-pf-green-900">
                    {t("beto.name")}
                  </div>
                  <div className="text-xs text-pf-ink-soft">{t("beto.role")}</div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* text */}
          <Reveal delay={0.1} className="order-2">
            <Eyebrow>{t("beto.eyebrow")}</Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight text-pf-green-900 text-balance md:text-4xl">
              {t("beto.title")}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-pf-ink-soft text-pretty">
              {t("beto.intro")}
            </p>
            <p className="mt-4 font-display text-xl italic text-pf-green-600">
              {t("beto.welcome")}
            </p>

            <div className="mt-7 border-t border-pf-border pt-6">
              <p className="text-base text-pf-ink-soft">{t("beto.bio")}</p>
              <div className="mt-4 rounded-2xl bg-pf-green-100 px-5 py-4">
                <p className="font-display text-lg italic leading-snug text-pf-green-800">
                  “{t("beto.positioning")}”
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        {/* prova social */}
        <Reveal className="mt-16 md:mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className="font-display text-2xl font-semibold text-pf-green-900 text-balance md:text-3xl">
              {t("beto.socialTitle")}
            </h3>
            <p className="mt-3 text-pf-ink-soft">{t("beto.socialSubtitle")}</p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {SOCIALS.map(({ platform, handle, url, pt, en, Icon }) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-2xl border border-pf-border bg-white p-5 transition-all hover:-translate-y-1 hover:border-pf-green-200 hover:pf-shadow-card"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pf-green-700 text-pf-cream transition-colors group-hover:bg-pf-green-600">
                  <Icon size={22} />
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-pf-green-900">{platform}</div>
                  <div className="truncate text-sm text-pf-ink-soft">{handle}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="font-display text-xl font-semibold text-pf-green-700">
                    {lang === "pt" ? pt : en}
                  </div>
                  <div className="text-xs text-pf-ink-soft">
                    {t("beto.followers")}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
