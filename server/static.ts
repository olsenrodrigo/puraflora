import path from "node:path";
import fs from "node:fs";
import express, { type Express } from "express";

// Serve o build estático do front-end (gerado por `vite build` em ./dist)
// com fallback de SPA para as rotas do wouter.
export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist");
  if (!fs.existsSync(distPath)) {
    throw new Error(`Build não encontrado em ${distPath}. Rode "npm run build:client" antes.`);
  }
  app.use(express.static(distPath));
  app.use((_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}
