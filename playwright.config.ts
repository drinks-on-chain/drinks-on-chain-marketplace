import { defineConfig, devices } from "@playwright/test";

// Dos modos:
// - Por defecto, las pruebas de flujo contra los mocks (sin backend), en el puerto 3105. Móvil
//   primero: cada prueba pasa a 390 px (teléfono, con tacto) y a 1280 px (escritorio).
// - `E2E_REAL_API=1`: solo `backend-real.spec.ts`, contra el backend de `E2E_API_ORIGIN` (solo
//   lectura), en el puerto 3115. Es el único modo que ejercita el pasaporte pedido en el servidor.
const REAL = process.env.E2E_REAL_API === "1";
const PORT = Number(process.env.E2E_PORT ?? (REAL ? 3115 : 3105));
// En local se usa el Chrome instalado; en CI, el Chromium que instala Playwright.
const channel = process.env.CI ? undefined : "chrome";

const mobile = {
  name: "movil",
  use: {
    browserName: "chromium" as const,
    channel,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
};
const desktop = {
  name: "escritorio",
  use: { ...devices["Desktop Chrome"], channel, viewport: { width: 1280, height: 800 } },
};

export default defineConfig({
  testDir: "./e2e",
  testMatch: REAL ? "backend-real.spec.ts" : "*.spec.ts",
  testIgnore: REAL ? undefined : "backend-real.spec.ts",
  fullyParallel: !REAL,
  workers: REAL ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI && !REAL ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  // MSW arranca en el navegador antes de pintar: margen para máquinas cargadas.
  expect: { timeout: REAL ? 20_000 : 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "es-BO",
    trace: "retain-on-failure",
  },
  projects: REAL ? [mobile] : [mobile, desktop],
  webServer: {
    command: `pnpm build && pnpm exec next start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: REAL
      ? {
          NEXT_PUBLIC_MOCKS: "0",
          API_ORIGIN: process.env.E2E_API_ORIGIN ?? "",
          NEXT_PUBLIC_URL_APP: `http://localhost:${PORT}`,
        }
      : {
          NEXT_PUBLIC_MOCKS: "1",
          NEXT_PUBLIC_URL_APP: `http://localhost:${PORT}`,
          NEXT_PUBLIC_URL_LANDING: "https://landing.ejemplo.test",
          NEXT_PUBLIC_URL_BODEGAS: "https://bodegas.ejemplo.test",
        },
  },
});
