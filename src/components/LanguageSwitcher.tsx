import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const LANGS = [
  {
    code: "pt",
    label: "Português",
    short: "PT",
    flag: (
      <svg viewBox="0 0 640 480" className="h-full w-full">
        <rect width="640" height="480" fill="#009c3b" />
        <path d="M320 55 585 240 320 425 55 240Z" fill="#ffdf00" />
        <circle cx="320" cy="240" r="90" fill="#002776" />
        <path
          d="M245 235q75-42 150 8"
          stroke="#fff"
          strokeWidth="12"
          fill="none"
        />
      </svg>
    ),
  },
  {
    code: "en",
    label: "English",
    short: "EN",
    flag: (
      <svg viewBox="0 0 640 480" className="h-full w-full">
        <rect width="640" height="480" fill="#012169" />
        <path d="M0 0 640 480M640 0 0 480" stroke="#fff" strokeWidth="64" />
        <path d="M0 0 640 480M640 0 0 480" stroke="#c8102e" strokeWidth="38" />
        <path d="M320 0V480M0 240H640" stroke="#fff" strokeWidth="104" />
        <path d="M320 0V480M0 240H640" stroke="#c8102e" strokeWidth="62" />
      </svg>
    ),
  },
];

export default function LanguageSwitcher({
  tone = "dark",
}: {
  tone?: "dark" | "light";
}) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const base = i18n.language?.split("-")[0] || "pt";
  const current = LANGS.find((l) => l.code === base) ?? LANGS[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const change = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  const triggerText = tone === "light" ? "text-pf-cream" : "text-pf-ink";
  const triggerBorder =
    tone === "light" ? "border-white/25 hover:bg-white/10" : "border-pf-green-900/12 hover:bg-pf-green-900/5";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-colors",
          triggerText,
          triggerBorder
        )}
        aria-label="Change language"
      >
        <span className="h-4 w-6 overflow-hidden rounded-[3px] shadow-sm">
          {current.flag}
        </span>
        <span className="hidden sm:inline">{current.short}</span>
        <ChevronDown
          size={13}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-pf-green-900/10 bg-white pf-shadow-card"
          >
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => change(l.code)}
                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm text-pf-ink transition-colors hover:bg-pf-cream-100"
              >
                <span className="h-4 w-6 overflow-hidden rounded-[3px] shadow-sm">
                  {l.flag}
                </span>
                <span className="flex-1 font-medium">{l.label}</span>
                {l.code === base && (
                  <Check size={15} className="text-pf-green-500" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
