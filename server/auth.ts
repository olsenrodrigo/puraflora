import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const JWT_EXPIRES_IN = "7d";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET não definido no .env");
  return secret;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export interface AdminTokenPayload {
  id: number;
  email: string;
  role: string;
}

export function signToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): AdminTokenPayload | null {
  try {
    return jwt.verify(token, getSecret()) as AdminTokenPayload;
  } catch {
    return null;
  }
}

export interface AuthedRequest extends Request {
  admin?: AdminTokenPayload;
}

function extractPayload(req: AuthedRequest): AdminTokenPayload | null {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  return verifyToken(token);
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const payload = extractPayload(req);
  if (!payload) return res.status(401).json({ error: "Não autenticado ou token inválido" });
  req.admin = payload;
  next();
}

/** Igual a requireAdmin, mas só libera se o papel do usuário estiver na lista. */
export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const payload = extractPayload(req);
    if (!payload) return res.status(401).json({ error: "Não autenticado ou token inválido" });
    if (!roles.includes(payload.role)) {
      return res.status(403).json({ error: "Acesso não autorizado para este papel" });
    }
    req.admin = payload;
    next();
  };
}

export const MIN_PASSWORD_LENGTH = 8;

export function isPasswordStrongEnough(password: string): boolean {
  return typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH;
}
