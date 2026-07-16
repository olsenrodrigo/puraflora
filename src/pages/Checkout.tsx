import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Loader2,
  MessageCircle,
  ShoppingBag,
  Truck,
} from "lucide-react";
import type { Lang } from "@/i18n";
import { getPackage, tp, WHATSAPP_NUMBER } from "@/data/catalog";
import { useCart } from "@/context/CartContext";
import CouponField from "@/components/store/CouponField";
import { brl, cn } from "@/lib/utils";
import PaymentPanel from "@/components/checkout/PaymentPanel";
import { trackBeginCheckout, trackPurchase, useAnalyticsReady, type AnalyticsItem } from "@/lib/analytics";

interface PaymentConfig {
  enabled: boolean;
  mock: boolean;
  maxInstallments: number;
  methods?: Array<"PIX" | "BOLETO" | "CREDIT_CARD">;
  cardMode?: "embedded" | "redirect";
}

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
  const { lines, subtotal, clear, coupon, discount, couponBelowMin, removeCoupon, cartToken } = useCart();
  const [recoverConsent, setRecoverConsent] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);

  // pagamento online (Asaas)
  const [payCfg, setPayCfg] = useState<PaymentConfig | null>(null);
  const [payStep, setPayStep] = useState<null | {
    orderNumber: string;
    total: number;
    customer: { name: string; phone: string; email: string };
    items: AnalyticsItem[];
    coupon?: string;
  }>(null);
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    fetch("/api/payments/config")
      .then((r) => r.json())
      .then(setPayCfg)
      .catch(() => setPayCfg(null));
  }, []);

  // Captura de carrinho abandonado (só com consentimento). Debounce ~2,5s para
  // não gravar a cada tecla; upsert idempotente por cartToken no servidor.
  useEffect(() => {
    if (!recoverConsent || !cartToken) return; // sem token seguro → sem captura
    const phone = form.phone.replace(/\D/g, "");
    if (phone.length < 8 || lines.length === 0) return;
    const handle = window.setTimeout(() => {
      fetch("/api/carts/abandoned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartToken,
          customerName: form.name || null,
          customerPhone: form.phone,
          customerEmail: form.email || null,
          couponCode: coupon && !couponBelowMin ? coupon.code : null,
          consent: true,
          items: lines.map((l) => ({
            productSlug: l.product.slug,
            productName: tp(l.product, lang).name,
            quantity: l.quantity,
            unitPrice: l.product.price.toFixed(2),
          })),
        }),
      }).catch(() => {});
    }, 2500);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recoverConsent, form.name, form.phone, form.email, lines, coupon, couponBelowMin]);

  // Itens no formato de analytics (usado no begin_checkout e no purchase)
  const analyticsItems = (): AnalyticsItem[] =>
    lines.map((l) => ({
      slug: l.product.slug,
      name: tp(l.product, lang).name,
      price: l.product.price,
      quantity: l.quantity,
    }));

  // Analytics: begin_checkout ao abrir o checkout (1x, quando há itens). Só marca
  // "done" após o analytics estar pronto — se o consentimento chegar depois, o
  // efeito reexecuta (dep analyticsOn) e o evento não se perde.
  const analyticsOn = useAnalyticsReady();
  const beganCheckout = useMemo(() => ({ done: false }), []);
  useEffect(() => {
    if (!beganCheckout.done && analyticsOn && lines.length > 0) {
      beganCheckout.done = true;
      trackBeginCheckout(analyticsItems());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.length, analyticsOn]);

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

  // Passo de pagamento online (após criar o pedido)
  if (payStep) {
    return (
      <div className="min-h-screen bg-pf-cream pb-20 pt-24 md:pt-28">
        <div className="container-pf mx-auto max-w-lg">
          <h1 className="mb-6 font-display text-3xl font-semibold text-pf-green-900">
            {lang === "pt" ? "Finalizar pagamento" : "Complete payment"}
          </h1>
          <PaymentPanel
            orderNumber={payStep.orderNumber}
            total={payStep.total}
            customer={payStep.customer}
            maxInstallments={payCfg?.maxInstallments ?? 12}
            methods={payCfg?.methods}
            cardMode={payCfg?.cardMode}
            analyticsItems={payStep.items}
            couponCode={payStep.coupon}
          />
        </div>
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
  const total = Math.max(0, subtotal - discount) + shippingCost;

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

  const buildOrderPayload = () => ({
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
    couponCode: coupon && !couponBelowMin ? coupon.code : null,
    cartToken,
    items: lines.map((l) => ({
      productSlug: l.product.slug,
      productName: tp(l.product, lang).name,
      quantity: l.quantity,
      unitPrice: l.product.price.toFixed(2),
      totalPrice: l.lineTotal.toFixed(2),
    })),
  });

  // Pagar online: cria o pedido no backend, obtém o número e vai pro passo de pagamento
  const payOnline = async () => {
    setTouched(true);
    if (missing.length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setPayLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildOrderPayload()),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && (data.code === "coupon_exhausted" || data.code === "coupon_invalid")) {
          removeCoupon();
          window.alert(
            lang === "pt"
              ? "O cupom não está mais disponível. O total foi atualizado — confira e finalize novamente."
              : "The coupon is no longer available. The total was updated — please review and finish again."
          );
          return;
        }
        throw new Error(data.error || "Erro ao criar pedido");
      }
      const purchaseItems = analyticsItems();
      // Total 0 (cupom de 100% + frete grátis): nada a pagar online — pedido concluído
      // AGORA (não há pagamento a confirmar) → purchase aqui.
      if (Number(data.total) <= 0) {
        trackPurchase({ orderNumber: data.orderNumber, value: Number(data.total), coupon: coupon?.code, items: purchaseItems });
        clear();
        setSent(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      // Fluxo online COM cobrança: purchase só quando o pagamento for confirmado
      // (disparado pelo PaymentPanel), não na criação do pedido.
      clear();
      setPayStep({
        orderNumber: data.orderNumber,
        total: Number(data.total),
        customer: { name: form.name, phone: form.phone, email: form.email },
        items: purchaseItems,
        coupon: coupon?.code,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.alert("Não foi possível iniciar o pagamento. Tente novamente.");
    } finally {
      setPayLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (missing.length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Abre a aba do WhatsApp JÁ no gesto do clique (evita bloqueio de popup) e
    // redireciona depois que o pedido é confirmado no backend (que conta o cupom).
    const waWindow = window.open("", "_blank");

    let orderNumber = "";
    let serverTotal = total;
    let serverDiscount = discount;
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildOrderPayload()),
      });
      const data = await res.json();
      if (!res.ok) {
        waWindow?.close();
        if (res.status === 409 && (data.code === "coupon_exhausted" || data.code === "coupon_invalid")) {
          removeCoupon();
          window.alert(
            lang === "pt"
              ? "O cupom não está mais disponível. O total foi atualizado — confira e finalize novamente."
              : "The coupon is no longer available. The total was updated — please review and finish again."
          );
          return;
        }
        window.alert(
          lang === "pt"
            ? "Não foi possível registrar o pedido. Tente novamente."
            : "Could not place the order. Try again."
        );
        return;
      }
      orderNumber = data.orderNumber;
      serverTotal = Number(data.total);
      serverDiscount = Number(data.discountAmount ?? discount);
      trackPurchase({ orderNumber, value: serverTotal, coupon: coupon?.code, items: analyticsItems() });
    } catch {
      waWindow?.close();
      window.alert(lang === "pt" ? "Falha de conexão. Tente novamente." : "Connection failed. Try again.");
      return;
    }

    const itemLines = lines
      .map((l) => `• ${l.quantity}x ${tp(l.product, lang).name} — ${brl(l.lineTotal)}`)
      .join("\n");

    const msg = [
      t("checkout.orderIntro"),
      "",
      `${lang === "pt" ? "Pedido" : "Order"}: ${orderNumber}`,
      itemLines,
      "",
      `${t("cart.subtotal")}: ${brl(subtotal)}`,
      serverDiscount > 0 && `${t("cart.discount")} (${coupon?.code}): -${brl(serverDiscount)}`,
      shipSel &&
        `${t("checkout.freightRow")}: ${
          shipSel.free ? t("checkout.freightFree") : brl(shipSel.finalValue)
        } (${shipSel.service})`,
      `${t("checkout.total")}: ${brl(serverTotal)}`,
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
    if (waWindow) waWindow.location.href = url;
    else window.open(url, "_blank");
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
              <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-pf-ink-soft">
                <input
                  type="checkbox"
                  checked={recoverConsent}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRecoverConsent(checked);
                    // Revogação LGPD: ao desmarcar, apaga o que já foi capturado.
                    if (!checked && cartToken) {
                      fetch(`/api/carts/abandoned/${cartToken}`, { method: "DELETE" }).catch(() => {});
                    }
                  }}
                  className="mt-0.5 h-4 w-4 accent-pf-green-700"
                />
                <span>{t("checkout.recoverConsent")}</span>
              </label>
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
                {discount > 0 && (
                  <div className="flex items-center justify-between text-pf-green-700">
                    <span>
                      {t("cart.discount")} ({coupon?.code})
                    </span>
                    <span className="font-medium">−{brl(discount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-pf-green-900/8 pt-3">
                  <span className="font-semibold text-pf-green-900">
                    {t("checkout.total")}
                  </span>
                  <span className="font-display text-2xl font-semibold text-pf-green-900">
                    {brl(total)}
                  </span>
                </div>
              </div>

              <CouponField />

              {payCfg?.enabled ? (
                <div className="mt-5 space-y-2.5">
                  <button
                    type="button"
                    onClick={payOnline}
                    disabled={payLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-pf-green-700 px-6 py-3.5 text-sm font-semibold text-pf-cream transition-colors hover:bg-pf-green-600 disabled:opacity-60"
                  >
                    {payLoading ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <CreditCard size={17} />
                    )}
                    {lang === "pt" ? "Pagar online" : "Pay online"}
                    <span className="text-xs font-normal text-pf-cream/80">
                      PIX · {lang === "pt" ? "boleto" : "boleto"} · {lang === "pt" ? "cartão" : "card"}
                    </span>
                  </button>
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-pf-green-700/30 px-6 py-3.5 text-sm font-semibold text-pf-green-700 transition-colors hover:bg-pf-green-900/5"
                  >
                    <MessageCircle size={17} />
                    {lang === "pt" ? "Finalizar pelo WhatsApp" : "Finish via WhatsApp"}
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-pf-green-700 px-6 py-3.5 text-sm font-semibold text-pf-cream transition-colors hover:bg-pf-green-600"
                >
                  <MessageCircle size={17} />
                  {t("checkout.placeOrder")}
                </button>
              )}
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
