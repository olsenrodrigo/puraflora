import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const SESSION_KEY = "pf_splash_seen";
const HOLD_MS = 2000; // tempo visível antes de revelar a página
const FADE_MS = 650;

/**
 * Abertura da marca: reproduz o wordmark animado por ~2s e some,
 * revelando a página. Aparece uma vez por sessão e respeita
 * prefers-reduced-motion. Pode ser dispensado com clique/tecla.
 */
export default function SplashIntro() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      /* sessionStorage indisponível */
    }
    if (reduce || seen) return;

    setShow(true);
    document.body.style.overflow = "hidden";
    // marca só ao fechar, para não quebrar sob StrictMode (double-invoke)
    const id = window.setTimeout(dismiss, HOLD_MS);

    return () => {
      clearTimeout(id);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    document.body.style.overflow = "";
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-pf-cream"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: FADE_MS / 1000, ease: "easeInOut" }}
          onClick={dismiss}
          role="presentation"
          aria-hidden
        >
          <video
            className="w-[min(88vw,720px)]"
            src="/media/wordmark.mp4"
            poster="/media/wordmark-poster.webp"
            autoPlay
            muted
            playsInline
            preload="auto"
          />
          <button
            onClick={dismiss}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium text-pf-ink-soft/70 transition-colors hover:text-pf-green-700"
          >
            Pular ›
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
