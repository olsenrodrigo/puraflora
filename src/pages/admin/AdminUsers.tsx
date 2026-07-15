import { useEffect, useState } from "react";
import { Check, Copy, Pencil, Plus, Trash2, X } from "lucide-react";
import { useAdminFetch, useAdminAuth } from "@/context/AdminAuthContext";

interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  mustChangePassword: boolean;
}

const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "financeiro", label: "Financeiro" },
  { value: "operacao", label: "Operação" },
];

const EMPTY_FORM = { name: "", email: "", role: "operacao", password: "" };

export default function AdminUsers() {
  const adminFetch = useAdminFetch();
  const { admin: currentAdmin } = useAdminAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch("/api/admin/users");
    setUsers(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (u: AdminUserRow) => {
    setForm({ name: u.name, email: u.email, role: u.role, password: "" });
    setEditingId(u.id);
    setError(null);
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload: Record<string, unknown> = { name: form.name, email: form.email, role: form.role };
    if (form.password) payload.password = form.password;

    const res = await adminFetch(
      editingId ? `/api/admin/users/${editingId}` : "/api/admin/users",
      { method: editingId ? "PUT" : "POST", body: JSON.stringify(payload) }
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Falha ao salvar usuário");
      return;
    }
    setShowForm(false);
    await load();
    if (!editingId && data.tempPassword) {
      setTempPassword({ email: data.email, password: data.tempPassword });
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmingId(null);
    const res = await adminFetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Falha ao excluir usuário");
      return;
    }
    await load();
  };

  const roleLabel = (role: string) => ROLES.find((r) => r.value === role)?.label ?? role;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-pf-green-900">Usuários</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-full bg-pf-green-700 px-5 py-2.5 text-sm font-semibold text-pf-cream hover:bg-pf-green-600"
        >
          <Plus size={16} /> Novo usuário
        </button>
      </div>

      {error && !showForm && (
        <p className="mt-4 rounded-lg bg-pf-clay/10 px-4 py-3 text-sm text-pf-clay">{error}</p>
      )}

      {showForm && (
        <form onSubmit={submit} className="mt-6 rounded-2xl border border-pf-border bg-white p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-pf-green-900">
            {editingId ? "Editar usuário" : "Novo usuário"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Nome</span>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">E-mail</span>
              <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">Papel</span>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="input">
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-pf-ink">
                Senha {editingId && "(deixe em branco para manter)"}
              </span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={editingId ? "••••••••" : "gerar automaticamente"}
                className="input"
              />
            </label>
          </div>
          {error && <p className="mt-3 rounded-lg bg-pf-clay/10 px-3 py-2 text-sm text-pf-clay">{error}</p>}
          <div className="mt-5 flex gap-3">
            <button type="submit" className="rounded-full bg-pf-green-700 px-6 py-2.5 text-sm font-semibold text-pf-cream hover:bg-pf-green-600">
              Salvar
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-pf-border px-6 py-2.5 text-sm font-semibold text-pf-ink-soft hover:bg-pf-cream-100">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {tempPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 pf-shadow-card">
            <h3 className="font-display text-lg font-semibold text-pf-green-900">Usuário criado</h3>
            <p className="mt-2 text-sm text-pf-ink-soft">
              Senha temporária para <b>{tempPassword.email}</b> — o usuário precisará trocá-la no primeiro login. Copie agora, ela não será mostrada novamente.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-pf-border bg-pf-cream-100 px-4 py-3">
              <code className="flex-1 font-mono text-sm text-pf-ink">{tempPassword.password}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword.password);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-pf-border text-pf-ink-soft hover:bg-white"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </div>
            <button
              onClick={() => setTempPassword(null)}
              className="mt-5 w-full rounded-full bg-pf-green-700 py-2.5 text-sm font-semibold text-pf-cream hover:bg-pf-green-600"
            >
              Entendi, fechar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-pf-ink-soft">Carregando...</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-pf-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-pf-cream-100 text-xs font-semibold uppercase tracking-wide text-pf-ink-soft">
              <tr>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">E-mail</th>
                <th className="px-5 py-3">Papel</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pf-border">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3 font-medium text-pf-ink">
                    {u.name} {u.id === currentAdmin?.id && <span className="text-xs text-pf-ink-soft">(você)</span>}
                  </td>
                  <td className="px-5 py-3 text-pf-ink-soft">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-pf-cream-200 px-2.5 py-1 text-xs font-semibold text-pf-ink">
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={u.active ? "text-pf-green-700" : "text-pf-ink-soft"}>
                      {u.active ? "Ativo" : "Inativo"}
                    </span>
                    {u.mustChangePassword && (
                      <span className="ml-2 text-xs text-pf-gold-600">(troca de senha pendente)</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {confirmingId === u.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-medium text-pf-clay">Excluir?</span>
                        <button onClick={() => handleDelete(u.id)} className="flex h-9 w-9 items-center justify-center rounded-full bg-pf-clay text-white hover:bg-pf-clay/90" aria-label="Confirmar">
                          <Check size={15} />
                        </button>
                        <button onClick={() => setConfirmingId(null)} className="flex h-9 w-9 items-center justify-center rounded-full border border-pf-border text-pf-ink-soft hover:bg-pf-cream-100" aria-label="Cancelar">
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(u)} className="flex h-9 w-9 items-center justify-center rounded-full border border-pf-border text-pf-ink-soft hover:bg-pf-cream-100">
                          <Pencil size={15} />
                        </button>
                        {u.id !== currentAdmin?.id && (
                          <button onClick={() => setConfirmingId(u.id)} className="flex h-9 w-9 items-center justify-center rounded-full border border-pf-border text-pf-clay hover:bg-pf-clay/10">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
