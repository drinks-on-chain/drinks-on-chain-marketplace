import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // La primera prueba de cada archivo carga jsdom y los módulos: en una máquina cargada supera
    // los 5 s por defecto sin que nada falle.
    testTimeout: 20_000,
    // Hilos en vez de procesos: arrancan antes (con procesos, en una máquina cargada algún
    // archivo no llegaba a arrancar: "Timeout waiting for worker to respond").
    pool: "threads",
  },
});
