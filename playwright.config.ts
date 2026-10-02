import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3105);
// En local se usa el Chrome instalado; en CI, el Chromium que instala Playwright.
const channel = process.env.CI ? undefined : "chrome";

// Las pruebas de flujo corren siempre contra los mocks (sin backend). Móvil primero: cada
// prueba pasa a 390 px (teléfono, con tacto) y a 1280 px (escritorio).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  // MSW arranca en el navegador antes de pintar: margen para máquinas cargadas.
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "es-BO",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "movil",
      use: {
        browserName: "chromium",
        channel,
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    { name: "escritorio", use: { ...devices["Desktop Chrome"], channel, viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `pnpm build && pnpm exec next start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      NEXT_PUBLIC_MOCKS: "1",
      NEXT_PUBLIC_URL_APP: `http://localhost:${PORT}`,
      NEXT_PUBLIC_URL_LANDING: "https://landing.ejemplo.test",
      NEXT_PUBLIC_URL_BODEGAS: "https://bodegas.ejemplo.test",
    },
  },
});
