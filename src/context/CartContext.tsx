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
import { trackAddToCart } from "@/lib/analytics";
import i18n from "@/i18n";

interface StoredItem {
  slug: string;
  quantity: number;
}

// Snapshot de um kit no carrinho (preço de exibição; o servidor re-preça no pedido).
export interface StoredBundle {
  slug: string;
  quantity: number;
  name: string;
  image?: string | null;
  unitTotal: number; // preço do kit (1 unidade), já com desconto
  originalTotal: number; // soma dos componentes sem desconto (1 unidade)
  components: { name: string; quantity: number }[];
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
  bundles: StoredBundle[];
  cartToken: string;
  add: (slug: string, quantity?: number) => void;
  setQty: (slug: string, quantity: number) => void;
  remove: (slug: string) => void;
  addBundle: (bundle: StoredBundle) => void;
  removeBundle: (slug: string) => void;
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
const TOKEN_KEY = "pf_cart_token";
const BUNDLES_KEY = "pf_bundles";

function loadBundles(): StoredBundle[] {
  try {
    const raw = localStorage.getItem(BUNDLES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((b) => typeof b?.slug === "string" && typeof b?.unitTotal === "number");
  } catch {
    return [];
  }
}

// UUID v4 criptograficamente seguro (o token é uma capability — precisa ser
// imprevisível). Sem Web Crypto seguro, devolve "" e a recuperação fica desligada.
function newToken(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const b = new Uint8Array(16);
      crypto.getRandomValues(b);
      b[6] = (b[6] & 0x0f) | 0x40;
      b[8] = (b[8] & 0x3f) | 0x80;
      const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
      return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
    }
  } catch {
    /* sem crypto */
  }
  return "";
}
function loadToken(): string {
  try {
    const existing = localStorage.getItem(TOKEN_KEY);
    if (existing) return existing;
    const t = newToken();
    if (t) localStorage.setItem(TOKEN_KEY, t); // não persiste token vazio
    return t;
  } catch {
    return newToken();
  }
}

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
  const [bundles, setBundles] = useState<StoredBundle[]>(loadBundles);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(loadCoupon);
  const [isOpen, setIsOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [cartToken, setCartToken] = useState<string>(loadToken);

  useEffect(() => {
    try {
      localStorage.setItem(BUNDLES_KEY, JSON.stringify(bundles));
    } catch {
      /* ignore */
    }
  }, [bundles]);

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
    const product = PRODUCTS.find((p) => p.slug === slug);
    if (!product) return;
    const lang = (i18n.language?.split("-")[0] ?? "pt") as keyof typeof product.i18n;
    trackAddToCart({ slug, name: (product.i18n?.[lang] ?? product.i18n?.pt)?.name, price: product.price, quantity });
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

  const addBundle = (bundle: StoredBundle) => {
    setBundles((prev) => {
      const existing = prev.find((b) => b.slug === bundle.slug);
      if (existing) {
        return prev.map((b) => (b.slug === bundle.slug ? { ...b, quantity: b.quantity + bundle.quantity } : b));
      }
      return [...prev, bundle];
    });
    setLastAdded(bundle.slug);
    window.setTimeout(() => setLastAdded(null), 2200);
  };

  const removeBundle = (slug: string) =>
    setBundles((prev) => prev.filter((b) => b.slug !== slug));

  const removeCoupon = () => setCoupon(null);

  const clear = () => {
    setItems([]);
    setBundles([]);
    setCoupon(null); // pós-compra o cupom não vaza para a próxima compra
    // Rotaciona o token: o próximo carrinho é um novo checkout (o antigo já foi
    // convertido/registrado no servidor).
    const t = newToken();
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    setCartToken(t);
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
    () => items.reduce((s, i) => s + i.quantity, 0) + bundles.reduce((s, b) => s + b.quantity, 0),
    [items, bundles]
  );
  const bundleSubtotal = useMemo(
    () => bundles.reduce((s, b) => s + b.unitTotal * b.quantity, 0),
    [bundles]
  );
  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.lineTotal, 0) + bundleSubtotal,
    [lines, bundleSubtotal]
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

  // Restaura um carrinho abandonado: ?recover=<token> repovoa os itens e adota o
  // token (para linkar a conversão). Roda antes do cupom (o snapshot pode ter um).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const recover = params.get("recover");
    if (!recover) return;
    fetch(`/api/carts/abandoned/${encodeURIComponent(recover)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.items) && d.items.length) {
          d.items.forEach((it: { productSlug: string; quantity: number }) => {
            if (it?.productSlug) add(it.productSlug, it.quantity || 1);
          });
          if (d.couponCode) applyCoupon(d.couponCode);
          try {
            localStorage.setItem(TOKEN_KEY, recover);
          } catch {
            /* ignore */
          }
          setCartToken(recover);
          setIsOpen(true);
        }
      })
      .catch(() => {});
    params.delete("recover");
    const qs = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    bundles,
    cartToken,
    add,
    setQty,
    remove,
    addBundle,
    removeBundle,
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
