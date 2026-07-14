import { useTranslation } from "react-i18next";
import { Leaf } from "lucide-react";

export default function Marquee() {
  const { t } = useTranslation();
  const items = t("marquee", { returnObjects: true }) as string[];
  const loop = [...items, ...items];

  return (
    <div className="border-y border-pf-green-900/8 bg-pf-green-700 py-3.5 text-pf-cream">
      <div className="pf-fade-mask flex overflow-hidden">
        <div className="pf-marquee flex shrink-0 items-center gap-8 whitespace-nowrap pr-8">
          {loop.map((item, i) => (
            <span
              key={i}
              className="flex items-center gap-8 text-sm font-medium tracking-wide"
            >
              <Leaf size={15} className="text-pf-gold-300" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
