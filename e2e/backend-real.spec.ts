import { expect, test } from "@playwright/test";

// Visor contra el backend REAL de desarrollo (solo lectura). No corre con `pnpm e2e` ni en la CI:
//
//   E2E_REAL_API=1 E2E_API_ORIGIN=https://… pnpm e2e
//
// Opcionales: `E2E_LOT_CODE` (un lote embotellado que exista; por defecto CVJ-2026-SINGANI-002) y
// `E2E_BOTTLE_CODE` (un código de botella real; sin él, la prueba de botella se salta).
// No consulta códigos inventados: el backend frena a quien pide muchos códigos inexistentes.

const LOT = process.env.E2E_LOT_CODE ?? "CVJ-2026-SINGANI-002";
const BOTTLE = process.env.E2E_BOTTLE_CODE;

test("el pasaporte del lote va en el HTML inicial, con sus metadatos, y se puede indexar", async ({ request }) => {
  const response = await request.get(`/b/${LOT}`);
  expect(response.status()).toBe(200);
  const html = await response.text();
  // El contenido está sin ejecutar JavaScript.
  expect(html).toContain("Esta etiqueta identifica el lote");
  expect(html).toContain("Registro del lote");
  expect(html).toContain("Reglas con las que se hizo el lote");
  // Metadatos del lote.
  expect(html.match(/<meta name="robots"[^>]*>/g)).toEqual(['<meta name="robots" content="index, follow"/>']);
  expect(html).toMatch(new RegExp(`<link rel="canonical" href="[^"]*/b/${LOT}"`));
  expect(html).toMatch(/<meta property="og:title" content="[^"]+"/);
  expect(html).toMatch(/<meta name="description" content="[^"]*lote /);
});

test("al hidratar no vuelve a pedir el pasaporte (lo pidió el servidor)", async ({ page }) => {
  const apiCalls: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/v1/public/")) apiCalls.push(r.url());
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(`/b/${LOT}`);
  await expect(page.getByText("Esta etiqueta identifica el lote")).toBeVisible();
  await expect(page.getByRole("region", { name: "Elaboración" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(apiCalls).toEqual([]);
  expect(errors).toEqual([]);
});

test("sin JavaScript el lote se lee entero", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`/b/${LOT}`);
  await expect(page.locator("h1")).not.toBeEmpty();
  await expect(page.locator("main h2")).toContainText(["Expediente del lote", "Origen", "Elaboración"]);
  await context.close();
});

test("la URL no canónica del lote redirige con 308", async ({ request }) => {
  const response = await request.get(`/b/${LOT.toLowerCase()}`, { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe(`/b/${LOT}`);
});

test("bodegas reales y catálogo «próximamente»", async ({ page }) => {
  await page.goto("/bodegas");
  await expect(page.getByRole("main").getByRole("article").first()).toBeVisible();
  await page.goto("/catalogo");
  await expect(page.getByRole("heading", { name: "El catálogo llega muy pronto" })).toBeVisible();
});

test("botella real: serie, lote y comprobación del código", async ({ page }) => {
  test.skip(!BOTTLE, "Sin E2E_BOTTLE_CODE: lo cubre el recorrido h2-pasaporte del repo drinks-on-chain-e2e");
  await page.goto(`/b/${BOTTLE}`);
  await expect(page.getByText(/Botella n\.º [\d.]+ de [\d.]+/)).toBeVisible();
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  // Con el expediente cerrado la prueba Merkle debe cuadrar; con el expediente abierto, se explica.
  await expect(
    page
      .getByText("Este código pertenece al expediente cerrado")
      .or(page.getByText(/La bodega aún no cerró el expediente de este lote/)),
  ).toBeVisible();
  await expect(page.getByText("No pudimos confirmar este código")).toHaveCount(0);
});
