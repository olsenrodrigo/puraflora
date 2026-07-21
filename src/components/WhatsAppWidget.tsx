import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WhatsAppIcon } from "@/components/icons/Social";
import { WHATSAPP_NUMBER, WHATSAPP_DISPLAY } from "@/data/catalog";

// Webchat flutuante que abre uma conversa no WhatsApp da PuraFlora.
// Botão fixo no canto; ao abrir, mostra um cartão com saudação + CTA que leva
// ao wa.me com uma mensagem pré-preenchida. Fica abaixo do carrinho/consent
// (z-40 < z-[60]) e some no admin (montado só no site).
export default function WhatsAppWidget() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);

  // Fecha com Esc e com clique fora; ao abrir, foca o CTA (acessível no teclado).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // atraso 0 para não capturar o mesmo evento que abriu o cartão
    const timer = window.setTimeout(() => document.addEventListener("pointerdown", onDown), 0);
    ctaRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      window.clearTimeout(timer);
    };
  }, [open]);

  const startChat = () => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t("webchat.greetingMsg"))}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 print:hidden"
    >
      {/* Cartão do webchat */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="whatsapp-webchat-card"
            role="dialog"
            aria-label={t("webchat.title")}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="w-[300px] origin-bottom-right overflow-hidden rounded-2xl border border-pf-green-900/10 bg-white shadow-[0_12px_40px_rgba(20,60,40,0.18)]"
          >
            {/* Cabeçalho */}
            <div className="flex items-center gap-3 bg-pf-green-700 px-4 py-3.5 text-pf-cream">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pf-cream/15">
                <WhatsAppIcon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t("webchat.title")}</p>
                <p className="flex items-center gap-1.5 text-xs text-pf-cream/75">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-pf-gold-300" />
                  {t("webchat.status")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("webchat.close")}
                className="rounded-full p-1 text-pf-cream/70 transition-colors hover:bg-pf-cream/10 hover:text-pf-cream"
              >
                <X size={16} />
              </button>
            </div>

            {/* Corpo */}
            <div className="space-y-3 px-4 py-4">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-pf-cream px-3.5 py-2.5 text-sm leading-relaxed text-pf-ink">
                {t("webchat.greeting")}
              </div>
              <button
                ref={ctaRef}
                type="button"
                onClick={startChat}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#20bd5a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pf-green-700"
              >
                <WhatsAppIcon size={18} /> {t("webchat.cta")}
              </button>
              <p className="text-center text-[11px] text-pf-ink-soft">
                {WHATSAPP_DISPLAY} · {t("webchat.hint")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão flutuante (FAB) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t("webchat.close") : t("webchat.open")}
        aria-expanded={open}
        aria-controls="whatsapp-webchat-card"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_rgba(37,211,102,0.45)] transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pf-green-700"
      >
        {open ? <X size={24} /> : <WhatsAppIcon size={28} />}
      </button>
    </div>
  );
}
