import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  tone?: "dark" | "light";
  withTagline?: boolean;
}

/** Wordmark PuraFlora (imagem oficial). Use tone="light" sobre fundos escuros. */
export default function Logo({
  className,
  tone = "dark",
  withTagline = false,
}: LogoProps) {
  const src = withTagline
    ? "/brand/logo-tagline.webp"
    : tone === "light"
      ? "/brand/logo-cream.webp"
      : "/brand/logo.webp";
  return (
    <img
      src={src}
      alt="PuraFlora"
      className={cn("h-8 w-auto select-none", className)}
      draggable={false}
    />
  );
}

/** Somente o ícone (broto). */
export function LogoMark({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <img
      src={tone === "light" ? "/brand/icon-cream.webp" : "/brand/icon.webp"}
      alt="PuraFlora"
      className={cn("h-9 w-9 select-none object-contain", className)}
      draggable={false}
    />
  );
}

/**
 * Ícone com animação de brilho percorrendo as folhas + glow pulsante.
 * A luz é mascarada pelo alfa do ícone, então brilha apenas sobre o broto.
 */
export function GlowLogo({
  className,
  tone = "dark",
  glow = "#95a48e",
}: {
  className?: string;
  tone?: "dark" | "light";
  glow?: string;
}) {
  return (
    <span className={cn("relative inline-block", className)}>
      <span
        className="pf-glow-pulse pointer-events-none absolute -inset-4 rounded-full blur-2xl"
        style={{
          background: `radial-gradient(circle, ${glow} 0%, #cdb59b 45%, transparent 72%)`,
        }}
        aria-hidden
      />
      <img
        src={tone === "light" ? "/brand/icon-cream.webp" : "/brand/icon.webp"}
        alt="PuraFlora"
        className="relative h-full w-full object-contain drop-shadow-[0_0_18px_rgba(149,164,142,0.35)]"
        draggable={false}
      />
      <span
        className="pf-leaf-shine pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          WebkitMaskImage: "url(/brand/icon.png)",
          maskImage: "url(/brand/icon.png)",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      />
    </span>
  );
}
