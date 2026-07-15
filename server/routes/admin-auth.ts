import { Router } from "express";
import { getAdminByEmail, getAdminById, updateAdminUser } from "../storage";
import {
  comparePassword,
  signToken,
  hashPassword,
  requireAdmin,
  isPasswordStrongEnough,
  MIN_PASSWORD_LENGTH,
  type AuthedRequest,
} from "../auth";

function toSafeAdmin(admin: {
  id: number;
  name: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
}) {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    mustChangePassword: admin.mustChangePassword,
  };
}

export function adminAuthRouter(): Router {
  const router = Router();

  router.post("/login", async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
    }
    const admin = await getAdminByEmail(email);
    if (!admin || !admin.active || !comparePassword(password, admin.passwordHash)) {
      return res.status(401).json({ error: "E-mail ou senha inválidos" });
    }
    const token = signToken({ id: admin.id, email: admin.email, role: admin.role });
    return res.json({ token, admin: toSafeAdmin(admin) });
  });

  router.put("/change-password", requireAdmin, async (req: AuthedRequest, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Informe a senha atual e a nova senha" });
    }
    if (!isPasswordStrongEnough(newPassword)) {
      return res.status(400).json({ error: `A nova senha precisa ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres` });
    }
    const admin = await getAdminById(req.admin!.id);
    if (!admin || !comparePassword(currentPassword, admin.passwordHash)) {
      return res.status(401).json({ error: "Senha atual incorreta" });
    }
    const updated = await updateAdminUser(admin.id, {
      passwordHash: hashPassword(newPassword),
      mustChangePassword: false,
    });
    const token = signToken({ id: updated.id, email: updated.email, role: updated.role });
    return res.json({ token, admin: toSafeAdmin(updated) });
  });

  return router;
}
