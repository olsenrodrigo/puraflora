import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, Leaf } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

export default function Newsletter() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setDone(true);
    setEmail("");
  };

  return (
    <section className="bg-pf-cream-100 py-20 md:py-24">
      <div className="container-pf">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pf-green-700 to-pf-green-900 px-6 py-14 text-center text-pf-cream pf-grain sm:px-12">
            <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-pf-gold-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -right-10 h-56 w-56 rounded-full bg-pf-green-400/25 blur-3xl" />

            <div className="relative mx-auto max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-pf-cream/20 px-3.5 py-1.5 text-xs font-medium text-pf-cream/90">
                <Leaf size={13} className="text-pf-gold-300" />
                {t("newsletter.eyebrow")}
              </span>
              <h2 className="mt-5 font-display text-3xl font-semibold text-pf-cream text-balance md:text-4xl">
                {t("newsletter.title")}
              </h2>
              <p className="mt-4 text-pf-cream/75 text-pretty">
                {t("newsletter.subtitle")}
              </p>

              {done ? (
                <div className="mx-auto mt-8 inline-flex items-center gap-2 rounded-full bg-pf-cream/10 px-6 py-3.5 font-medium text-pf-gold-300">
                  <Check size={18} /> {t("newsletter.done")}
                </div>
              ) : (
                <form
                  onSubmit={submit}
                  className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
                >
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("newsletter.placeholder")}
                    className="w-full rounded-full border border-pf-cream/20 bg-pf-cream/10 px-5 py-3.5 text-sm text-pf-cream placeholder:text-pf-cream/50 outline-none focus:border-pf-gold-400"
                  />
                  <button
                    type="submit"
                    className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-pf-gold-500 px-6 py-3.5 text-sm font-semibold text-pf-green-900 transition-colors hover:bg-pf-gold-400"
                  >
                    {t("newsletter.cta")}
                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </button>
                </form>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
