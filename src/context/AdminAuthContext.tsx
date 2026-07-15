import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

const TOKEN_KEY = "pf_admin_token";
const USER_KEY = "pf_admin_user";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
}

interface AdminAuthContextType {
  token: string | null;
  admin: AdminUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY)
  );
  const [admin, setAdmin] = useState<AdminUser | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  const setSession = (newToken: string, newAdmin: AdminUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newAdmin));
    setToken(newToken);
    setAdmin(newAdmin);
  };

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha no login");
    setSession(data.token, data.admin);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setAdmin(null);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const res = await fetch("/api/admin/change-password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha ao trocar senha");
    setSession(data.token, data.admin);
  };

  return (
    <AdminAuthContext.Provider
      value={{ token, admin, isAuthenticated: !!token, login, logout, changePassword }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth precisa estar dentro de <AdminAuthProvider>");
  return ctx;
}

/** fetch com Authorization: Bearer <token> injetado automaticamente. */
export function useAdminFetch() {
  const { token, logout } = useAdminAuth();
  return async (input: string, init: RequestInit = {}) => {
    const res = await fetch(input, {
      ...init,
      headers: {
        ...(init.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 401) logout();
    return res;
  };
}
