import { useAdminAuth } from "@/context/AdminAuthContext";

export default function AdminHome() {
  const { admin } = useAdminAuth();
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-pf-green-900">
        Olá, {admin?.name?.split(" ")[0] ?? "administrador"}
      </h1>
      <p className="mt-2 text-pf-ink-soft">
        Use o menu acima para gerenciar produtos e acompanhar pedidos.
      </p>
    </div>
  );
}
