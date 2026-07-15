import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import "./index.css";
import App from "./App";
import { CartProvider } from "./context/CartContext";
import { ProductsProvider } from "./context/ProductsContext";
import { AdminAuthProvider } from "./context/AdminAuthContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminAuthProvider>
      <ProductsProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </ProductsProvider>
    </AdminAuthProvider>
  </StrictMode>
);
