import { useState } from "react";
import { useLocation } from "wouter";
import { Leaf, Lock, Mail } from "lucide-react";
import Logo from "@/components/brand/Logo";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      setLocation("/admin/produtos");
    } catch (err: any) {
      setError(err.message || "Falha no login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-pf-cream-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-pf-border bg-white p-8 pf-shadow-card">
        <div className="flex justify-center">
          <Logo className="h-10" />
        </div>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-sm text-pf-ink-soft">
          <Leaf size={14} className="text-pf-green-500" /> Painel administrativo
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-pf-ink">
              E-mail
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pf-ink-soft" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@puraflora.com.br"
                className="w-full rounded-xl border border-pf-border bg-white py-3 pl-10 pr-4 text-sm text-pf-ink outline-none transition-colors focus:border-pf-green-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-pf-ink">
              Senha
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pf-ink-soft" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-pf-border bg-white py-3 pl-10 pr-4 text-sm text-pf-ink outline-none transition-colors focus:border-pf-green-400"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-pf-clay/10 px-3 py-2 text-sm text-pf-clay">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-pf-green-700 py-3 text-sm font-semibold text-pf-cream transition-colors hover:bg-pf-green-600 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
