import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PRODUCTS, type Product } from "@/data/catalog";
import { computeDiscount, normalizeCouponCode } from "../../shared/coupon-utils";

interface StoredItem {
  slug: string;
  quantity: number;
}

export interface CartLine {
  product: Product;
  quantity: number;
  lineTotal: number;
}

export interface AppliedCoupon {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderValue: number | null;
}

interface CartContextType {
  items: StoredItem[];
  lines: CartLine[];
  add: (slug: string, quantity?: number) => void;
  setQty: (slug: string, quantity: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  itemCount: number;
  subtotal: number;
  // cupom
  coupon: AppliedCoupon | null;
  couponBelowMin: boolean; // aplicado mas subtotal < mínimo (desconto = 0, fica "armado")
  discount: number;
  applyCoupon: (code: string) => Promise<{ ok: boolean; reason?: string }>;
  removeCoupon: () => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  lastAdded: string | null;
}

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = "pf_cart";
const COUPON_KEY = "pf_coupon";

function load(): StoredItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i) => typeof i?.slug === "string" && typeof i?.quantity === "number"
    );
  } catch {
    return [];
  }
}

function loadCoupon(): AppliedCoupon | null {
  try {
    const raw = localStorage.getItem(COUPON_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (typeof c?.code !== "string" || (c.type !== "percentage" && c.type !== "fixed")) return null;
    return { code: c.code, type: c.type, value: Number(c.value), minOrderValue: c.minOrderValue != null ? Number(c.minOrderValue) : null };
  } catch {
    return null;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<StoredItem[]>(load);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(loadCoupon);
  const [isOpen, setIsOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore quota errors */
    }
  }, [items]);

  useEffect(() => {
    try {
      if (coupon) localStorage.setItem(COUPON_KEY, JSON.stringify(coupon));
      else localStorage.removeItem(COUPON_KEY);
    } catch {
      /* ignore */
    }
  }, [coupon]);

  const add = (slug: string, quantity = 1) => {
    if (!PRODUCTS.some((p) => p.slug === slug)) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.slug === slug);
      if (existing) {
        return prev.map((i) =>
          i.slug === slug ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { slug, quantity }];
    });
    setLastAdded(slug);
    window.setTimeout(() => setLastAdded(null), 2200);
  };

  const setQty = (slug: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.slug !== slug)
        : prev.map((i) => (i.slug === slug ? { ...i, quantity } : i))
    );
  };

  const remove = (slug: string) =>
    setItems((prev) => prev.filter((i) => i.slug !== slug));

  const removeCoupon = () => setCoupon(null);

  const clear = () => {
    setItems([]);
    setCoupon(null); // pós-compra o cupom não vaza para a próxima compra
  };

  const lines: CartLine[] = useMemo(() => {
    return items
      .map((i) => {
        const product = PRODUCTS.find((p) => p.slug === i.slug);
        if (!product) return null;
        return {
          product,
          quantity: i.quantity,
          lineTotal: product.price * i.quantity,
        };
      })
      .filter(Boolean) as CartLine[];
  }, [items]);

  const itemCount = useMemo(
    () => items.reduce((s, i) => s + i.quantity, 0),
    [items]
  );
  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.lineTotal, 0),
    [lines]
  );

  // desconto reativo: 0 se sem cupom ou abaixo do mínimo (cupom fica "armado")
  const couponBelowMin = useMemo(
    () => !!coupon && coupon.minOrderValue != null && subtotal < coupon.minOrderValue,
    [coupon, subtotal]
  );
  const discount = useMemo(
    () => (coupon && !couponBelowMin ? computeDiscount(coupon.type, coupon.value, subtotal) : 0),
    [coupon, couponBelowMin, subtotal]
  );

  const applyCoupon = async (rawCode: string): Promise<{ ok: boolean; reason?: string }> => {
    const code = normalizeCouponCode(rawCode);
    if (!code) return { ok: false };
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal }),
      });
      const d = await res.json();
      if (d.valid) {
        setCoupon({
          code: d.code,
          type: d.type,
          value: Number(d.value),
          minOrderValue: d.minOrderValue != null ? Number(d.minOrderValue) : null,
        });
        return { ok: true };
      }
      // abaixo do mínimo: arma o cupom (desconto ativa quando o subtotal atingir o mínimo)
      if (d.reason === "min_order" && d.type) {
        setCoupon({
          code,
          type: d.type,
          value: Number(d.value),
          minOrderValue: d.minOrderValue != null ? Number(d.minOrderValue) : null,
        });
        return { ok: true, reason: "min_order" };
      }
      return { ok: false, reason: d.reason };
    } catch {
      return { ok: false, reason: "network" };
    }
  };

  // Link com cupom: ?cupom=XYZ (ou ?coupon=) em qualquer rota → aplica e limpa a URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("cupom") ?? params.get("coupon");
    if (code) {
      applyCoupon(code); // inválido → ignora silenciosamente (requisito)
      params.delete("cupom");
      params.delete("coupon");
      const qs = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
    } else if (coupon) {
      // Revalida o cupom persistido no localStorage: limpa se ficou inválido
      // (expirou/esgotou/desativou) para não exibir desconto obsoleto.
      fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: coupon.code, subtotal }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.valid || (d.reason === "min_order" && d.type)) {
            setCoupon({
              code: d.code ?? coupon.code,
              type: d.type,
              value: Number(d.value),
              minOrderValue: d.minOrderValue != null ? Number(d.minOrderValue) : null,
            });
          } else {
            setCoupon(null);
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: CartContextType = {
    items,
    lines,
    add,
    setQty,
    remove,
    clear,
    itemCount,
    subtotal,
    coupon,
    couponBelowMin,
    discount,
    applyCoupon,
    removeCoupon,
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    lastAdded,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve estar dentro de CartProvider");
  return ctx;
}
