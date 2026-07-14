import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SplashIntro from "@/components/SplashIntro";
import Home from "@/pages/Home";
import Store from "@/pages/Store";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Etiquetas from "@/pages/Etiquetas";
import NotFound from "@/pages/NotFound";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location]);
  return null;
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <SplashIntro />
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/loja" component={Store} />
          <Route path="/loja/produto/:slug" component={ProductDetail} />
          <Route path="/loja/carrinho" component={Cart} />
          <Route path="/loja/checkout" component={Checkout} />
          <Route path="/etiquetas" component={Etiquetas} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
