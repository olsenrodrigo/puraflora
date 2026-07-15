import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Check,
  Loader2,
  MessageCircle,
  ShoppingBag,
  Truck,
} from "lucide-react";
import type { Lang } from "@/i18n";
import { getPackage, tp, WHATSAPP_NUMBER } from "@/data/catalog";
import { useCart } from "@/context/CartContext";
import { brl, cn } from "@/lib/utils";

interface ShipOption {
  id: string;
  service: string;
  days: number;
  value: number;
  finalValue: number;
  free: boolean;
}

interface Form {
  name: string;
  email: string;
  phone: string;
  cep: string;
  address: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  notes: string;
}

const EMPTY: Form = {
  name: "",
  email: "",
  phone: "",
  cep: "",
  address: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
  notes: "",
};

export default function Checkout() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.split("-")[0] as Lang) || "pt";
  const { lines, subtotal, clear } = useCart();
  const [form, setForm] = useState<Form>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);

  // frete
  const [shipOptions, setShipOptions] = useState<ShipOption[] | null>(null);
  const [shipSel, setShipSel] = useState<ShipOption | null>(null);
  const [shipLoading, setShipLoading] = useState(false);
  const [shipError, setShipError] = useState("");
  const [shipMock, setShipMock] = useState(false);

  const volumes = useMemo(
    () =>
      lines.map((l) => {
        const p = getPackage(l.product.slug);
        return {
          weight: p.weightG / 1000,
          height: p.heightCm,
          width: p.widthCm,
          length: p.lengthCm,
          quantity: l.quantity,
          price: l.product.price,
        };
      }),
    [lines]
  );

  const required: (keyof Form)[] = [
    "name",
    "phone",
    "cep",
    "address",
    "number",
    "district",
    "city",
    "state",
  ];
  const missing = required.filter((k) => !form[k].trim());

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  if (sent) {
    return (
      <div className="flex min-h-[75vh] flex-col items-center justify-center gap-5 bg-pf-cream px-4 pt-24 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pf-green-100">
          <Check size={34} className="text-pf-green-600" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-pf-green-900">
          {lang === "pt"
            ? "Pedido enviado! 🌿"
            : "Order sent! 🌿"}
        </h1>
        <p className="max-w-md text-pf-ink-soft">
          {lang === "pt"
            ? "Abrimos o WhatsApp com o resumo do seu pedido. É só enviar a mensagem para concluirmos juntos."
            : "We've opened WhatsApp with your order summary. Just send the message and we'll finish it together."}
        </p>
        <Link
          href="/loja"
          className="rounded-full bg-pf-green-700 px-7 py-3.5 text-sm font-semibold text-pf-cream hover:bg-pf-green-600"
        >
          {t("cart.continue")}
        </Link>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 bg-pf-cream px-4 pt-24 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pf-green-100">
          <ShoppingBag size={30} className="text-pf-green-500" />
        </div>
        <p className="max-w-sm text-pf-ink-soft">{t("checkout.empty")}</p>
        <Link
          href="/loja"
          className="rounded-full bg-pf-green-700 px-7 py-3.5 text-sm font-semibold text-pf-cream hover:bg-pf-green-600"
        >
          {t("cart.emptyCta")}
        </Link>
      </div>
    );
  }

  const shippingCost = shipSel ? shipSel.finalValue : 0;
  const total = subtotal + shippingCost;

  const calcFreight = async () => {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) {
      setShipError(t("checkout.freightHintCep"));
      return;
    }
    setShipLoading(true);
    setShipError("");
    setShipSel(null);
    try {
      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zipTo: cep, subtotal, volumes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShipOptions(null);
        setShipError(data.error || t("checkout.freightError"));
        return;
      }
      const opts: ShipOption[] = data.options || [];
      setShipOptions(opts);
      setShipMock(!!data.mock);
      if (opts.length) setShipSel(opts[0]);
      else setShipError(t("checkout.freightNone"));
    } catch {
      setShipOptions(null);
      setShipError(t("checkout.freightError"));
    } finally {
      setShipLoading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (missing.length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const itemLines = lines
      .map(
        (l) =>
          `• ${l.quantity}x ${tp(l.product, lang).name} — ${brl(l.lineTotal)}`
      )
      .join("\n");

    const msg = [
      t("checkout.orderIntro"),
      "",
      itemLines,
      "",
      `${t("cart.subtotal")}: ${brl(subtotal)}`,
      shipSel &&
        `${t("checkout.freightRow")}: ${
          shipSel.free ? t("checkout.freightFree") : brl(shipSel.finalValue)
        } (${shipSel.service})`,
      `${t("checkout.total")}: ${brl(total)}`,
      "",
      `${t("checkout.name")}: ${form.name}`,
      `${t("checkout.phone")}: ${form.phone}`,
      form.email && `${t("checkout.email")}: ${form.email}`,
      `${t("checkout.address")}: ${form.address}, ${form.number}${
        form.complement ? ` — ${form.complement}` : ""
      }`,
      `${form.district} · ${form.city}/${form.state} · CEP ${form.cep}`,
      form.notes && `${t("checkout.notes")}: ${form.notes}`,
    ]
      .filter(Boolean)
      .join("\n");

    // Registra o pedido no backend (para aparecer no admin) sem bloquear o
    // fluxo do WhatsApp — se a chamada falhar, a experiência do usuário
    // continua idêntica.
    fetch("/api/orders", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: form.name,
        customerEmail: form.email || null,
        customerPhone: form.phone,
        shippingCep: form.cep,
        shippingAddress: form.address,
        shippingNumber: form.number,
        shippingComplement: form.complement || null,
        shippingDistrict: form.district,
        shippingCity: form.city,
        shippingState: form.state,
        notes: form.notes || null,
        subtotal: subtotal.toFixed(2),
        shippingService: shipSel?.service ?? null,
        shippingAmount: shippingCost.toFixed(2),
        total: total.toFixed(2),
        items: lines.map((l) => ({
          productSlug: l.product.slug,
          productName: tp(l.product, lang).name,
          quantity: l.quantity,
          unitPrice: l.product.price.toFixed(2),
          totalPrice: l.lineTotal.toFixed(2),
        })),
      }),
    }).catch(() => {});

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    clear();
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-pf-cream pb-20 pt-24 md:pt-28">
      <div className="container-pf">
        <Link
          href="/loja/carrinho"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-pf-green-700 hover:underline"
        >
          <ArrowLeft size={15} /> {t("checkout.backCart")}
        </Link>

        <h1 className="mt-4 font-display text-3xl font-semibold text-pf-green-900 md:text-4xl">
          {t("checkout.title")}
        </h1>
        <p className="mt-2 max-w-lg text-pf-ink-soft">{t("checkout.subtitle")}</p>

        <form
          onSubmit={submit}
          className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]"
        >
          <div className="space-y-8">
            {/* contact */}
            <fieldset className="rounded-2xl border border-pf-green-900/8 bg-white p-6">
              <legend className="px-2 font-display text-lg font-semibold text-pf-green-900">
                {t("checkout.contact")}
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("checkout.name")}
                  value={form.name}
                  onChange={set("name")}
                  error={touched && !form.name.trim() ? t("checkout.required") : ""}
                  className="sm:col-span-2"
                />
                <Field
                  label={t("checkout.email")}
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                />
                <Field
                  label={t("checkout.phone")}
                  value={form.phone}
                  onChange={set("phone")}
                  error={touched && !form.phone.trim() ? t("checkout.required") : ""}
                />
              </div>
            </fieldset>

            {/* shipping */}
            <fieldset className="rounded-2xl border border-pf-green-900/8 bg-white p-6">
              <legend className="px-2 font-display text-lg font-semibold text-pf-green-900">
                {t("checkout.shipping")}
              </legend>
              <div className="grid gap-4 sm:grid-cols-6">
                <Field
                  label={t("checkout.cep")}
                  value={form.cep}
                  onChange={set("cep")}
                  error={touched && !form.cep.trim() ? t("checkout.required") : ""}
                  className="sm:col-span-2"
                />
                <Field
                  label={t("checkout.address")}
                  value={form.address}
                  onChange={set("address")}
                  error={touched && !form.address.trim() ? t("checkout.required") : ""}
                  className="sm:col-span-4"
                />
                <Field
                  label={t("checkout.number")}
                  value={form.number}
                  onChange={set("number")}
                  error={touched && !form.number.trim() ? t("checkout.required") : ""}
                  className="sm:col-span-2"
                />
                <Field
                  label={t("checkout.complement")}
                  value={form.complement}
                  onChange={set("complement")}
                  className="sm:col-span-4"
                />
                <Field
                  label={t("checkout.district")}
                  value={form.district}
                  onChange={set("district")}
                  error={touched && !form.district.trim() ? t("checkout.required") : ""}
                  className="sm:col-span-3"
                />
                <Field
                  label={t("checkout.city")}
                  value={form.city}
                  onChange={set("city")}
                  error={touched && !form.city.trim() ? t("checkout.required") : ""}
                  className="sm:col-span-2"
                />
                <Field
                  label={t("checkout.state")}
                  value={form.state}
                  onChange={set("state")}
                  error={touched && !form.state.trim() ? t("checkout.required") : ""}
                  className="sm:col-span-1"
                />
                <Field
                  label={t("checkout.notes")}
                  value={form.notes}
                  onChange={set("notes")}
                  className="sm:col-span-6"
                />
              </div>
            </fieldset>

            {/* frete */}
            <fieldset className="rounded-2xl border border-pf-green-900/8 bg-white p-6">
              <legend className="px-2 font-display text-lg font-semibold text-pf-green-900">
                {t("checkout.freightLegend")}
              </legend>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={calcFreight}
                  disabled={
                    shipLoading || form.cep.replace(/\D/g, "").length !== 8
                  }
                  className="inline-flex items-center gap-2 rounded-full bg-pf-green-700 px-5 py-2.5 text-sm font-semibold text-pf-cream transition-colors hover:bg-pf-green-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {shipLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Truck size={16} />
                  )}
                  {shipLoading
                    ? t("checkout.calculating")
                    : t("checkout.calcFreight")}
                </button>
                {!shipOptions && !shipError && (
                  <span className="text-sm text-pf-ink-soft">
                    {t("checkout.freightHintCep")}
                  </span>
                )}
              </div>

              {shipError && (
                <p className="mt-3 text-sm text-pf-clay">{shipError}</p>
              )}

              {shipOptions && shipOptions.length > 0 && (
                <div className="mt-4 space-y-2">
                  {shipOptions.map((o) => {
                    const selected =
                      shipSel?.id === o.id && shipSel?.service === o.service;
                    return (
                      <label
                        key={o.id + o.service}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors",
                          selected
                            ? "border-pf-green-500 bg-pf-green-50"
                            : "border-pf-green-900/12 hover:border-pf-green-300"
                        )}
                      >
                        <input
                          type="radio"
                          name="freight"
                          checked={selected}
                          onChange={() => setShipSel(o)}
                          className="h-4 w-4 accent-pf-green-700"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-pf-green-900">
                            {o.service}
                          </div>
                          <div className="text-xs text-pf-ink-soft">
                            {o.days} {t("checkout.daysLabel")}
                          </div>
                        </div>
                        {o.free ? (
                          <span className="font-display text-lg font-semibold text-pf-green-600">
                            {t("checkout.freightFree")}
                          </span>
                        ) : (
                          <span className="font-display text-lg font-semibold text-pf-green-700">
                            {brl(o.finalValue)}
                          </span>
                        )}
                      </label>
                    );
                  })}
                  {shipMock && (
                    <p className="pt-1 text-xs text-pf-ink-soft/70">
                      {t("checkout.freightMock")}
                    </p>
                  )}
                </div>
              )}
            </fieldset>
          </div>

          {/* summary */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-pf-green-900/8 bg-white p-6">
              <h2 className="font-display text-lg font-semibold text-pf-green-900">
                {t("checkout.summary")}
              </h2>
              <ul className="mt-4 space-y-3">
                {lines.map(({ product, quantity, lineTotal }) => {
                  const text = tp(product, lang);
                  return (
                    <li key={product.slug} className="flex items-center gap-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-pf-cream-100">
                        <img
                          src={product.image}
                          alt={text.name}
                          className="h-full w-full object-contain p-1"
                        />
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-pf-green-700 px-1 text-[11px] font-bold text-pf-cream">
                          {quantity}
                        </span>
                      </div>
                      <span className="line-clamp-2 flex-1 text-xs font-medium text-pf-ink">
                        {text.name}
                      </span>
                      <span className="text-sm font-semibold text-pf-green-700">
                        {brl(lineTotal)}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-5 space-y-2 border-t border-pf-green-900/8 pt-5">
                <div className="flex items-center justify-between text-pf-ink-soft">
                  <span>{t("cart.subtotal")}</span>
                  <span className="font-medium text-pf-ink">{brl(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-pf-ink-soft">
                  <span>{t("checkout.freightRow")}</span>
                  <span className="font-medium text-pf-ink">
                    {shipSel
                      ? shipSel.free
                        ? t("checkout.freightFree")
                        : brl(shipSel.finalValue)
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-pf-green-900/8 pt-3">
                  <span className="font-semibold text-pf-green-900">
                    {t("checkout.total")}
                  </span>
                  <span className="font-display text-2xl font-semibold text-pf-green-900">
                    {brl(total)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-pf-green-700 px-6 py-3.5 text-sm font-semibold text-pf-cream transition-colors hover:bg-pf-green-600"
              >
                <MessageCircle size={17} />
                {t("checkout.placeOrder")}
              </button>
              {touched && missing.length > 0 && (
                <p className="mt-2 text-center text-xs text-pf-clay">
                  {t("checkout.required")}
                </p>
              )}
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  error,
  className,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  error?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-pf-ink-soft">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className={cn(
          "w-full rounded-xl border bg-pf-cream/40 px-3.5 py-2.5 text-sm text-pf-ink outline-none transition-colors focus:border-pf-green-400 focus:bg-white",
          error ? "border-pf-clay" : "border-pf-green-900/12"
        )}
      />
    </label>
  );
}
