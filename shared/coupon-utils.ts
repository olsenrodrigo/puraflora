// Matemática de desconto compartilhada entre front (resumo do carrinho) e
// servidor (total do pedido / valor cobrado) — evita divergência de arredondamento.

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeDiscount(
  type: "percentage" | "fixed" | string,
  value: number,
  subtotal: number
): number {
  if (!(subtotal > 0) || !(value > 0)) return 0;
  const raw = type === "percentage" ? (subtotal * value) / 100 : value;
  // clamp: o desconto nunca passa do subtotal (desconto só incide no subtotal)
  return round2(Math.min(raw, subtotal));
}

/** Normaliza o código do cupom (usado em TODA escrita e leitura). */
export function normalizeCouponCode(code: string): string {
  return (code || "").trim().toUpperCase();
}
