import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PRODUCTS, type Product } from "@/data/catalog";

interface StoredItem {
  slug: string;
  quantity: number;
}

export interface CartLine {
  product: Product;
  quantity: number;
  lineTotal: number;
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
  isOpen: boolean;
  open: () => void;
  close: () => void;
  lastAdded: string | null;
}

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = "pf_cart";

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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<StoredItem[]>(load);
  const [isOpen, setIsOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore quota errors */
    }
  }, [items]);

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

  const clear = () => setItems([]);

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

  const value: CartContextType = {
    items,
    lines,
    add,
    setQty,
    remove,
    clear,
    itemCount,
    subtotal,
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
