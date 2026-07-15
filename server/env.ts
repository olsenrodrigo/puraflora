// Carrega o .env manualmente (tsx não faz isso sozinho).
// Deve ser importado ANTES de qualquer módulo que leia process.env (ex: server/db.ts).
import fs from "node:fs";
import path from "node:path";

const p = path.resolve(process.cwd(), ".env");
if (fs.existsSync(p)) {
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
