import { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, MessageCircle, ShoppingBag } from "lucide-react";
import type { Lang } from "@/i18n";
import { tp, WHATSAPP_NUMBER } from "@/data/catalog";
import { useCart } from "@/context/CartContext";
import { brl, cn } from "@/lib/utils";

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

              <div className="mt-5 flex items-center justify-between border-t border-pf-green-900/8 pt-5">
                <span className="text-pf-ink-soft">{t("cart.subtotal")}</span>
                <span className="font-display text-2xl font-semibold text-pf-green-900">
                  {brl(subtotal)}
                </span>
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
