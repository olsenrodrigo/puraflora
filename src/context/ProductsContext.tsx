import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  setLiveCatalog,
  STATIC_PRODUCTS,
  STATIC_CATEGORIES,
  type Product,
  type Category,
} from "@/data/catalog";

interface ProductsContextType {
  products: Product[];
  categories: Category[];
  loading: boolean;
  refetch: () => void;
}

const ProductsContext = createContext<ProductsContextType | null>(null);

export function ProductsProvider({ children }: { children: ReactNode }) {
  // inicia com o catálogo estático — sem flash de loja vazia enquanto a API responde
  const [products, setProducts] = useState<Product[]>(STATIC_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(STATIC_CATEGORIES);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/store/products"),
        fetch("/api/store/categories"),
      ]);
      const prods: Product[] = await prodRes.json();
      const cats: Category[] = await catRes.json();
      setProducts(prods);
      setCategories(cats);
      setLiveCatalog(prods, cats);
    } catch {
      // mantém o catálogo estático (fallback) em caso de falha de rede
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ProductsContext.Provider value={{ products, categories, loading, refetch: load }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts precisa estar dentro de <ProductsProvider>");
  return ctx;
}
