import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Lock } from "lucide-react";
import Logo from "@/components/brand/Logo";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { cn } from "@/lib/utils";

const STRENGTH_LABELS = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];
const STRENGTH_COLORS = [
  "bg-pf-clay",
  "bg-pf-clay",
  "bg-pf-gold-500",
  "bg-pf-green-400",
  "bg-pf-green-700",
];

function passwordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

export default function AdminChangePassword() {
  const { changePassword, logout } = useAdminAuth();
  const [, setLocation] = useLocation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => passwordStrength(newPassword), [newPassword]);
  const strengthIndex = Math.max(0, strength - 1);
  const matches = newPassword.length > 0 && newPassword === confirmPassword;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("A nova senha precisa ter no mínimo 8 caracteres");
      return;
    }
    if (!matches) {
      setError("As senhas não coincidem");
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setLocation("/admin");
    } catch (err: any) {
      setError(err.message || "Falha ao trocar senha");
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
          <Lock size={14} className="text-pf-green-500" /> Troca de senha obrigatória
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Senha atual</span>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Nova senha</span>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
            />
            {newPassword && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 flex-1 rounded-full",
                        i <= strengthIndex ? STRENGTH_COLORS[strengthIndex] : "bg-pf-cream-200"
                      )}
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs text-pf-ink-soft">{STRENGTH_LABELS[strengthIndex]}</p>
              </div>
            )}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Confirmar nova senha</span>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
            />
            {confirmPassword && (
              <p className={cn("mt-1 text-xs", matches ? "text-pf-green-600" : "text-pf-clay")}>
                {matches ? "As senhas coincidem" : "As senhas não coincidem"}
              </p>
            )}
          </label>

          {error && (
            <p className="rounded-lg bg-pf-clay/10 px-3 py-2 text-sm text-pf-clay">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-pf-green-700 py-3 text-sm font-semibold text-pf-cream transition-colors hover:bg-pf-green-600 disabled:opacity-60"
          >
            {loading ? "Salvando..." : "Trocar senha"}
          </button>
          <button
            type="button"
            onClick={logout}
            className="w-full text-center text-sm text-pf-ink-soft hover:text-pf-green-700"
          >
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
