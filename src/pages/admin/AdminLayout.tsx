import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LogOut,
  Package,
  ShoppingBag,
  Star,
  Tags,
  BarChart3,
  Settings,
  Plug,
  Users,
} from "lucide-react";
import Logo from "@/components/brand/Logo";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/produtos", label: "Produtos", icon: Package, roles: ["admin", "financeiro", "operacao"] },
  { href: "/admin/destaques", label: "Destaques", icon: Star, roles: ["admin", "operacao"] },
  { href: "/admin/categorias", label: "Categorias", icon: Tags, roles: ["admin", "operacao"] },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag, roles: ["admin", "financeiro", "operacao"] },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3, roles: ["admin", "financeiro"] },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings, roles: ["admin"] },
  { href: "/admin/integracoes", label: "Integrações", icon: Plug, roles: ["admin", "financeiro"] },
  { href: "/admin/usuarios", label: "Usuários", icon: Users, roles: ["admin"] },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, admin, logout } = useAdminAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/admin/login");
      return;
    }
    if (admin?.mustChangePassword) {
      setLocation("/admin/trocar-senha");
    }
  }, [isAuthenticated, admin?.mustChangePassword, setLocation]);

  if (!isAuthenticated || admin?.mustChangePassword) return null;

  const links = NAV.filter((l) => l.roles.includes(admin!.role));

  return (
    <div className="min-h-screen bg-pf-cream-100">
      <header className="border-b border-pf-border bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3.5">
          <Link href="/admin/produtos">
            <Logo className="h-8" />
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            {links.map((l) => {
              const active = location.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-pf-green-100 text-pf-green-700"
                      : "text-pf-ink-soft hover:bg-pf-cream-100"
                  )}
                >
                  <l.icon size={15} /> {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-pf-ink-soft sm:inline">{admin?.name}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-full border border-pf-border px-3.5 py-2 text-sm font-semibold text-pf-ink-soft transition-colors hover:bg-pf-cream-100"
            >
              <LogOut size={15} /> Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
