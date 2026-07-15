import { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { requireRole, hashPassword, type AuthedRequest } from "../auth";
import {
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  getAdminByEmail,
} from "../storage";

const ROLES = ["admin", "financeiro", "operacao"] as const;

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(ROLES),
  password: z.string().min(8).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  let pwd = "";
  for (let i = 0; i < 12; i++) {
    pwd += chars[crypto.randomInt(chars.length)];
  }
  return pwd;
}

function sanitize(user: Record<string, unknown>) {
  const { passwordHash, ...safe } = user;
  return safe;
}

export function adminUsersRouter(): Router {
  const router = Router();
  router.use(requireRole("admin"));

  router.get("/", async (_req, res) => {
    const users = await listAdminUsers();
    res.json(users.map(sanitize));
  });

  router.post("/", async (req, res) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    }
    const existing = await getAdminByEmail(parsed.data.email);
    if (existing) return res.status(409).json({ error: "Já existe um usuário com este e-mail" });

    const tempPassword = parsed.data.password || generateTempPassword();
    const user = await createAdminUser({
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash: hashPassword(tempPassword),
      mustChangePassword: true,
    });
    res.status(201).json({ ...sanitize(user), tempPassword });
  });

  router.put("/:id", async (req: AuthedRequest, res) => {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    }
    const { password, ...rest } = parsed.data;
    const data: Record<string, unknown> = { ...rest };
    if (password) {
      data.passwordHash = hashPassword(password);
      data.mustChangePassword = true;
    }
    const user = await updateAdminUser(Number(req.params.id), data);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json(sanitize(user));
  });

  router.delete("/:id", async (req: AuthedRequest, res) => {
    if (Number(req.params.id) === req.admin?.id) {
      return res.status(400).json({ error: "Você não pode excluir seu próprio usuário" });
    }
    await deleteAdminUser(Number(req.params.id));
    res.status(204).send();
  });

  return router;
}
