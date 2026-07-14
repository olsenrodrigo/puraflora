import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { shippingApiPlugin } from "./vite-plugin-shipping";

export default defineConfig({
  plugins: [react(), tailwindcss(), shippingApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  server: {
    host: true,
    port: 5180,
    strictPort: false,
  },
});
