import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { LogoMark } from "@/components/brand/Logo";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-5 bg-pf-cream px-4 text-center">
      <LogoMark className="h-16 w-16 opacity-60" />
      <p className="font-display text-6xl font-semibold text-pf-green-200">404</p>
      <h1 className="font-display text-2xl font-semibold text-pf-green-900">
        {t("notFound.title")}
      </h1>
      <p className="max-w-sm text-pf-ink-soft">{t("notFound.subtitle")}</p>
      <Link
        href="/"
        className="rounded-full bg-pf-green-700 px-7 py-3.5 text-sm font-semibold text-pf-cream hover:bg-pf-green-600"
      >
        {t("notFound.cta")}
      </Link>
    </div>
  );
}
