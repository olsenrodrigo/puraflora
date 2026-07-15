import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Servidor de dev/produção real vive em server/index.ts (Express),
// que monta o Vite em middlewareMode — por isso host/port não são
// mais configurados aqui (quem escuta a porta é o Express, via PORT no .env).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
});
