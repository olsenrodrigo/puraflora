import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, ShoppingBag, X } from "lucide-react";
import Logo from "@/components/brand/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useCart } from "@/context/CartContext";
import { cn, scrollToId } from "@/lib/utils";

export default function Navbar() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { itemCount, open } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHome = location === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = !isHome || scrolled;

  const goToSection = (id: string) => {
    setMobileOpen(false);
    if (isHome) {
      scrollToId(id);
    } else {
      setLocation("/");
      window.setTimeout(() => scrollToId(id), 90);
    }
  };

  const links = [
    { label: t("nav.store"), type: "route" as const, href: "/loja" },
    { label: t("nav.beto"), type: "section" as const, id: "beto" },
    { label: t("nav.seal"), type: "section" as const, id: "selo" },
    { label: t("nav.benefits"), type: "section" as const, id: "benefits" },
    { label: t("nav.categories"), type: "section" as const, id: "categories" },
    { label: t("nav.philosophy"), type: "section" as const, id: "philosophy" },
  ];

  const linkClass =
    "rounded-full px-3 py-2.5 text-[15px] font-semibold text-pf-ink/90 whitespace-nowrap transition-colors hover:bg-pf-green-100 hover:text-pf-green-700";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        solid ? "pf-glass border-b border-pf-border py-2.5" : "py-4"
      )}
    >
      <nav className="container-pf flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0" onClick={() => setMobileOpen(false)}>
          <Logo className="h-11 md:h-[3.25rem]" />
        </Link>

        <div className="hidden items-center gap-0.5 lg:flex">
          {links.map((l) =>
            l.type === "route" ? (
              <Link key={l.label} href={l.href} className={linkClass}>
                {l.label}
              </Link>
            ) : (
              <button
                key={l.label}
                onClick={() => goToSection(l.id)}
                className={linkClass}
              >
                {l.label}
              </button>
            )
          )}
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher tone="dark" />

          <button
            onClick={open}
            aria-label={t("nav.cart")}
            className="relative flex h-12 w-12 items-center justify-center rounded-full border border-pf-border text-pf-green-800 transition-colors hover:bg-pf-green-100"
          >
            <ShoppingBag size={22} />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-pf-green-700 px-1 text-[13px] font-bold text-pf-cream">
                {itemCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-pf-border text-pf-green-800 transition-colors hover:bg-pf-green-100 lg:hidden"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden lg:hidden"
          >
            <div className="container-pf mt-2">
              <div className="rounded-2xl border border-pf-border bg-white p-2 pf-shadow-card">
                <Link
                  href="/loja"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-4 py-3.5 text-base font-semibold text-pf-ink hover:bg-pf-cream-100"
                >
                  {t("nav.store")}
                </Link>
                {[
                  { label: t("nav.beto"), id: "beto" },
                  { label: t("nav.seal"), id: "selo" },
                  { label: t("nav.benefits"), id: "benefits" },
                  { label: t("nav.categories"), id: "categories" },
                  { label: t("nav.philosophy"), id: "philosophy" },
                  { label: t("nav.contact"), id: "footer" },
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => goToSection(l.id)}
                    className="block w-full rounded-xl px-4 py-3.5 text-left text-base font-semibold text-pf-ink hover:bg-pf-cream-100"
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
