import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://localhost:5432/puraflora";

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url: DATABASE_URL },
});
