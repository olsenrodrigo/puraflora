import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LogOut,
  Menu,
  Package,
  ShoppingBag,
  Star,
  Tags,
  BarChart3,
  Settings,
  Plug,
  Users,
  Repeat,
  Ticket,
  ShoppingCart,
  MessageSquare,
  X,
  type LucideIcon,
} from "lucide-react";
import Logo from "@/components/brand/Logo";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    title: "Catálogo",
    items: [
      { href: "/admin/produtos", label: "Produtos", icon: Package, roles: ["admin", "financeiro", "operacao"] },
      { href: "/admin/destaques", label: "Destaques", icon: Star, roles: ["admin", "operacao"] },
      { href: "/admin/categorias", label: "Categorias", icon: Tags, roles: ["admin", "operacao"] },
      { href: "/admin/avaliacoes", label: "Avaliações", icon: MessageSquare, roles: ["admin", "operacao"] },
    ],
  },
  {
    title: "Vendas",
    items: [
      { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag, roles: ["admin", "financeiro", "operacao"] },
      { href: "/admin/assinaturas", label: "Assinaturas", icon: Repeat, roles: ["admin", "financeiro"] },
      { href: "/admin/carrinhos", label: "Carrinhos", icon: ShoppingCart, roles: ["admin", "operacao"] },
      { href: "/admin/cupons", label: "Cupons", icon: Ticket, roles: ["admin"] },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3, roles: ["admin", "financeiro"] },
      { href: "/admin/integracoes", label: "Integrações", icon: Plug, roles: ["admin", "financeiro"] },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: "/admin/configuracoes", label: "Configurações", icon: Settings, roles: ["admin"] },
      { href: "/admin/usuarios", label: "Usuários", icon: Users, roles: ["admin"] },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  financeiro: "Financeiro",
  operacao: "Operação",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, admin, logout } = useAdminAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/admin/login");
      return;
    }
    if (admin?.mustChangePassword) {
      setLocation("/admin/trocar-senha");
    }
  }, [isAuthenticated, admin?.mustChangePassword, setLocation]);

  // fecha a gaveta ao trocar de rota
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  if (!isAuthenticated || admin?.mustChangePassword) return null;

  const role = admin!.role;
  const sections = NAV.map((s) => ({
    ...s,
    items: s.items.filter((i) => i.roles.includes(role)),
  })).filter((s) => s.items.length > 0);

  const sidebar = (
    <nav className="flex h-full flex-col gap-6 p-4">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-pf-ink-soft/60">
            {section.title}
          </p>
          <div className="space-y-0.5">
            {section.items.map((l) => {
              const active = location.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                    active
                      ? "bg-pf-green-700 text-pf-cream"
                      : "text-pf-ink-soft hover:bg-pf-green-100 hover:text-pf-green-700"
                  )}
                >
                  <l.icon size={17} className="shrink-0" />
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-pf-cream-100">
      {/* Cabeçalho PuraFlora no topo (largura total) */}
      <header className="sticky top-0 z-30 border-b border-pf-border bg-white">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-pf-border text-pf-ink-soft lg:hidden"
              aria-label="Menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Link href="/admin/produtos" className="flex items-center gap-2.5">
              <Logo className="h-8" />
              <span className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-pf-ink-soft/60 sm:inline">
                Painel
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-pf-ink">{admin?.name}</p>
              <p className="text-xs text-pf-ink-soft">{ROLE_LABELS[role] ?? role}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-full border border-pf-border px-3.5 py-2 text-sm font-semibold text-pf-ink-soft transition-colors hover:bg-pf-cream-100"
            >
              <LogOut size={15} /> <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar fixa à esquerda (desktop) */}
        <aside className="sticky top-[61px] hidden h-[calc(100vh-61px)] w-60 shrink-0 overflow-y-auto border-r border-pf-border bg-white lg:block">
          {sidebar}
        </aside>

        {/* Gaveta lateral (mobile) */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 top-[57px] z-20 bg-black/30 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="fixed left-0 top-[57px] z-30 h-[calc(100vh-57px)] w-64 overflow-y-auto border-r border-pf-border bg-white lg:hidden">
              {sidebar}
            </aside>
          </>
        )}

        {/* Conteúdo */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
