import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, PackagePlus } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { brl } from "@/lib/utils";
import { priceBundle, type BundleDiscountType } from "../../../shared/bundle-pricing";

interface Component {
  productSlug: string;
  productName: string;
  image: string | null;
  active: boolean;
  unitPrice: number;
  quantity: number;
}
export interface ApiBundle {
  id: number;
  slug: string;
  i18n: Record<string, { name: string; description?: string }>;
  image: string | null;
  discountType: BundleDiscountType;
  discountValue: string;
  components: Component[];
}

export default function BundleOffer({ bundle }: { bundle: ApiBundle }) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.split("-")[0] ?? "pt") as keyof typeof bundle.i18n;
  const { addBundle } = useCart();
  const [added, setAdded] = useState(false);

  const name = (bundle.i18n?.[lang] ?? bundle.i18n?.pt)?.name ?? bundle.slug;
  const pricing = priceBundle(
    bundle.discountType,
    Number(bundle.discountValue),
    bundle.components.map((c) => ({ productSlug: c.productSlug, unitPrice: c.unitPrice, quantity: c.quantity }))
  );
  const savePct = pricing.originalTotal > 0 ? Math.round((pricing.discount / pricing.originalTotal) * 100) : 0;

  const handleAdd = () => {
    addBundle({
      slug: bundle.slug,
      quantity: 1,
      name,
      image: bundle.image,
      unitTotal: pricing.bundleTotal,
      originalTotal: pricing.originalTotal,
      components: bundle.components.map((c) => ({ name: c.productName, quantity: c.quantity })),
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="mt-10 rounded-2xl border-2 border-pf-green-700/20 bg-pf-green-50/40 p-6">
      <div className="flex items-center gap-2">
        <PackagePlus size={18} className="text-pf-green-700" />
        <h3 className="font-display text-lg font-semibold text-pf-green-900">{name}</h3>
        {savePct > 0 && (
          <span className="rounded-full bg-pf-green-700 px-2.5 py-0.5 text-xs font-bold text-pf-cream">−{savePct}%</span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {bundle.components.map((c, i) => (
          <div key={c.productSlug + i} className="flex items-center gap-2">
            {c.image && <img src={c.image} alt="" className="h-12 w-12 rounded-lg object-cover" />}
            <span className="text-sm text-pf-ink-soft">{c.quantity}x {c.productName}</span>
            {i < bundle.components.length - 1 && <span className="text-pf-ink-soft/50">+</span>}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          {pricing.discount > 0 && (
            <span className="mr-2 text-sm text-pf-ink-soft/70 line-through">{brl(pricing.originalTotal)}</span>
          )}
          <span className="text-2xl font-bold text-pf-green-800">{brl(pricing.bundleTotal)}</span>
          {pricing.discount > 0 && (
            <span className="ml-2 text-sm font-medium text-pf-green-700">
              {t("bundle.save")} {brl(pricing.discount)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-full bg-pf-green-700 px-6 py-2.5 text-sm font-semibold text-pf-cream hover:bg-pf-green-800"
        >
          {added ? <><Check size={16} /> {t("bundle.added")}</> : <><PackagePlus size={16} /> {t("bundle.add")}</>}
        </button>
      </div>
    </div>
  );
}
