import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { setAnalyticsConfig, enableAnalytics, type AnalyticsConfig } from "@/lib/analytics";

const CONSENT_KEY = "pf_consent"; // "granted" | "denied"

export default function CookieConsent() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/store/config")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const ac = (d?.analytics ?? {}) as AnalyticsConfig;
        setAnalyticsConfig(ac);
        const hasAnyPixel = !!(ac.ga4MeasurementId || ac.metaPixelId || ac.tiktokPixelId);
        if (!hasAnyPixel) return; // nada a medir → sem banner, sem scripts

        const decision = (() => {
          try {
            return localStorage.getItem(CONSENT_KEY);
          } catch {
            return null;
          }
        })();

        if (ac.requireConsent === false) {
          enableAnalytics(); // lojista dispensou consentimento
          return;
        }
        if (decision === "granted") enableAnalytics();
        else if (decision !== "denied") setVisible(true); // sem decisão → pergunta
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const decide = (granted: boolean) => {
    try {
      localStorage.setItem(CONSENT_KEY, granted ? "granted" : "denied");
    } catch {
      /* ignore */
    }
    if (granted) enableAnalytics();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t("consent.title")}
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-pf-border bg-pf-cream/95 backdrop-blur px-4 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
    >
      <div className="container-pf flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-relaxed text-pf-ink-soft">
          {t("consent.text")}
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => decide(false)}
            className="rounded-full border border-pf-border px-5 py-2 text-sm font-semibold text-pf-ink-soft hover:bg-pf-cream-200"
          >
            {t("consent.decline")}
          </button>
          <button
            type="button"
            onClick={() => decide(true)}
            className="rounded-full bg-pf-green-700 px-5 py-2 text-sm font-semibold text-pf-cream hover:bg-pf-green-800"
          >
            {t("consent.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
