import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Instagram, Facebook, Mail } from "lucide-react";
import Logo from "@/components/brand/Logo";
import { WhatsAppIcon } from "@/components/icons/Social";
import { WHATSAPP_NUMBER, WHATSAPP_DISPLAY } from "@/data/catalog";
import { scrollToId } from "@/lib/utils";

const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

export default function Footer() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();

  const section = (id: string) => {
    if (location === "/") scrollToId(id);
    else {
      setLocation("/");
      window.setTimeout(() => scrollToId(id), 90);
    }
  };

  return (
    <footer id="footer" className="pf-grain relative overflow-hidden bg-pf-green-900 text-pf-cream">
      {/* botanical glow */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-pf-green-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-pf-gold-500/10 blur-3xl" />

      <div className="container-pf relative py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <Logo tone="light" />
            <p className="mt-4 text-sm leading-relaxed text-pf-cream/70">
              {t("footer.tagline")}
            </p>
            <div className="mt-5 flex gap-2.5">
              {[
                { icon: Instagram, label: "Instagram", href: "#" },
                { icon: Facebook, label: "Facebook", href: "#" },
                { icon: WhatsAppIcon, label: "WhatsApp", href: WHATSAPP_LINK },
                { icon: Mail, label: "E-mail", href: "mailto:ola@puraflora.com.br" },
              ].map(({ icon: Icon, label, href }) => {
                const external = href.startsWith("http");
                return (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-pf-cream/15 text-pf-cream/80 transition-colors hover:border-pf-gold-500 hover:text-pf-gold-300"
                  >
                    <Icon size={17} />
                  </a>
                );
              })}
            </div>
          </div>

          <FooterCol title={t("footer.explore")}>
            <FooterLink onClick={() => setLocation("/loja")}>
              {t("footer.links.store")}
            </FooterLink>
            <FooterLink onClick={() => section("beto")}>
              {t("footer.links.beto")}
            </FooterLink>
            <FooterLink onClick={() => section("selo")}>
              {t("footer.links.seal")}
            </FooterLink>
            <FooterLink onClick={() => section("benefits")}>
              {t("footer.links.benefits")}
            </FooterLink>
            <FooterLink onClick={() => section("categories")}>
              {t("footer.links.categories")}
            </FooterLink>
            <FooterLink onClick={() => section("philosophy")}>
              {t("footer.links.philosophy")}
            </FooterLink>
          </FooterCol>

          <FooterCol title={t("footer.help")}>
            <FooterLink onClick={() => section("how")}>
              {t("footer.links.shipping")}
            </FooterLink>
            <FooterLink onClick={() => section("how")}>
              {t("footer.links.returns")}
            </FooterLink>
            <FooterLink onClick={() => section("faq")}>
              {t("footer.links.faq")}
            </FooterLink>
          </FooterCol>

          <FooterCol title={t("footer.contact")}>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-pf-cream/70 transition-colors hover:text-pf-gold-300"
            >
              WhatsApp: {WHATSAPP_DISPLAY}
            </a>
            <a
              href="mailto:ola@puraflora.com.br"
              className="text-sm text-pf-cream/70 transition-colors hover:text-pf-gold-300"
            >
              ola@puraflora.com.br
            </a>
            <span className="text-sm text-pf-cream/50">São Paulo · Brasil</span>
          </FooterCol>
        </div>

        <div className="mt-12 border-t border-pf-cream/12 pt-6">
          <p className="text-[11px] leading-relaxed text-pf-cream/45">
            {t("footer.disclaimer")}
          </p>
          <div className="mt-4 flex flex-col items-start justify-between gap-2 text-xs text-pf-cream/50 sm:flex-row sm:items-center">
            <span>
              © {new Date().getFullYear()} PuraFlora. {t("footer.rights")}
            </span>
            <span className="flex items-center gap-1.5">
              {t("brand.tagline")}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-pf-gold-300">
        {title}
      </h3>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function FooterLink({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left text-sm text-pf-cream/70 transition-colors hover:text-pf-gold-300"
    >
      {children}
    </button>
  );
}
