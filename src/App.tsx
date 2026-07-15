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
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminHome from "@/pages/admin/AdminHome";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminProductForm from "@/pages/admin/AdminProductForm";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminOrderDetail from "@/pages/admin/AdminOrderDetail";
import AdminChangePassword from "@/pages/admin/AdminChangePassword";
import AdminCategories from "@/pages/admin/AdminCategories";
import AdminFeaturedProducts from "@/pages/admin/AdminFeaturedProducts";
import AdminReports from "@/pages/admin/AdminReports";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminIntegrations from "@/pages/admin/AdminIntegrations";
import AdminSubscriptions from "@/pages/admin/AdminSubscriptions";
import AdminUsers from "@/pages/admin/AdminUsers";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location]);
  return null;
}

export default function App() {
  const [location] = useLocation();
  const isAdmin = location.startsWith("/admin");

  return (
    <div className="flex min-h-screen flex-col">
      {!isAdmin && <SplashIntro />}
      <ScrollToTop />
      {!isAdmin && <Navbar />}
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/loja" component={Store} />
          <Route path="/loja/produto/:slug" component={ProductDetail} />
          <Route path="/loja/carrinho" component={Cart} />
          <Route path="/loja/checkout" component={Checkout} />
          <Route path="/etiquetas" component={Etiquetas} />

          <Route path="/admin/login" component={AdminLogin} />
          <Route path="/admin/trocar-senha" component={AdminChangePassword} />
          <Route path="/admin" component={() => <AdminLayout><AdminHome /></AdminLayout>} />
          <Route path="/admin/produtos" component={() => <AdminLayout><AdminProducts /></AdminLayout>} />
          <Route path="/admin/produtos/novo" component={() => <AdminLayout><AdminProductForm /></AdminLayout>} />
          <Route path="/admin/produtos/:id/editar" component={() => <AdminLayout><AdminProductForm /></AdminLayout>} />
          <Route path="/admin/destaques" component={() => <AdminLayout><AdminFeaturedProducts /></AdminLayout>} />
          <Route path="/admin/categorias" component={() => <AdminLayout><AdminCategories /></AdminLayout>} />
          <Route path="/admin/pedidos" component={() => <AdminLayout><AdminOrders /></AdminLayout>} />
          <Route path="/admin/pedidos/:id" component={() => <AdminLayout><AdminOrderDetail /></AdminLayout>} />
          <Route path="/admin/assinaturas" component={() => <AdminLayout><AdminSubscriptions /></AdminLayout>} />
          <Route path="/admin/relatorios" component={() => <AdminLayout><AdminReports /></AdminLayout>} />
          <Route path="/admin/configuracoes" component={() => <AdminLayout><AdminSettings /></AdminLayout>} />
          <Route path="/admin/integracoes" component={() => <AdminLayout><AdminIntegrations /></AdminLayout>} />
          <Route path="/admin/usuarios" component={() => <AdminLayout><AdminUsers /></AdminLayout>} />

          <Route component={NotFound} />
        </Switch>
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <CartDrawer />}
    </div>
  );
}
