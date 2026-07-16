import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Rating({
  value,
  reviews,
  size = 14,
  className,
}: {
  value: number;
  reviews?: number;
  size?: number;
  className?: string;
}) {
  // Sem avaliações reais: não exibe estrelas (evita nota fake).
  if (reviews === 0) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="inline-flex" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i + 1 <= Math.round(value);
          return (
            <Star
              key={i}
              size={size}
              className={filled ? "text-pf-gold-500" : "text-pf-sand"}
              fill={filled ? "currentColor" : "none"}
              strokeWidth={1.6}
            />
          );
        })}
      </span>
      <span className="text-xs font-medium text-pf-ink-soft">
        {value.toFixed(1)}
        {reviews != null && (
          <span className="text-pf-ink-soft/70"> ({reviews})</span>
        )}
      </span>
    </span>
  );
}
