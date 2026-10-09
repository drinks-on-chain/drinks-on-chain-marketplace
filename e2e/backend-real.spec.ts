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
    const path = new URL(r.url()).pathname;
    // Con el expediente anclado (backend de la Ola 3) el navegador sí descarga el expediente y
    // pide la verificación para comprobar el anclaje; el pasaporte, nunca.
    if (path.startsWith("/api/v1/public/") && !/\/(dossier|verification)$/.test(path)) apiCalls.push(r.url());
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

test("anclaje en la red: funciona con un backend sin anclajes y, si lo hay, la huella recalculada coincide", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const verification: number[] = [];
  page.on("response", (r) => {
    if (new URL(r.url()).pathname.endsWith("/verification")) verification.push(r.status());
  });

  await page.goto(`/b/${LOT}`);
  const region = page.getByRole("region", { name: "Anclaje en la red" });
  await expect(region).toBeVisible();
  await page.waitForLoadState("networkidle");
  const text = (await region.textContent()) ?? "";
  if (/Anclado/.test(text)) {
    // Backend de la Ola 3: el recálculo en el navegador cuadra y hay cuatro comprobaciones.
    await expect(region.getByText("La huella recalculada coincide")).toBeVisible();
    await expect(region.getByRole("list", { name: "Comprobaciones" }).getByRole("listitem")).toHaveCount(4);
  } else {
    // Backend de la Ola 2 (`anchor: null`) o anclaje sin confirmar: se dice y no se pide nada más.
    expect(text).toMatch(/Sin anclaje|Anclaje en la red: pendiente/);
    await expect(region.getByRole("link")).toHaveCount(0);
    expect(verification).toEqual([]);
  }
  // Sin rastro de cuenta ni de compra contra el backend real (bandera apagada).
  await expect(page.getByRole("link", { name: /Entrar|Mi cuenta|Crear cuenta/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("sin JavaScript el lote se lee entero", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`/b/${LOT}`);
  await expect(page.locator("h1")).not.toBeEmpty();
  await expect(page.locator("main h2")).toContainText(["Expediente del lote", "Anclaje en la red", "Origen"]);
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
