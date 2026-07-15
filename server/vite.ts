import type { Express } from "express";

// Monta o dev-server do Vite (HMR) dentro do processo Express, para servir
// a SPA + API no mesmo processo/porta durante `npm run dev`.
export async function setupVite(app: Express) {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
