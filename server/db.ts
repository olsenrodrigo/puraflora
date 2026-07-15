import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";

let pool: Pool | undefined;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL não definida no .env");
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

export const db = drizzle(getPool(), { schema });
