import { expect, test, type Page } from "@playwright/test";
import { CASE, NO_PRICE_COLLECTION, axe, shellNav, trackErrors } from "./support";

// Bandera de la cuenta y la compra **apagada** (`NEXT_PUBLIC_MK_ACCOUNT` sin definir), como en
// producción y en las previews contra el backend real, que aún no tiene esas rutas. Corre aparte,
// contra su propio build: `pnpm e2e:sin-cuenta` (`E2E_ACCOUNT_OFF=1`, puerto 3106).
//
// No debe quedar rastro: ni un enlace o botón de cuenta o de compra, ni una página, ni una sola
// petición a las rutas de sesión, de pedidos o del perfil.

const ACCOUNT_ROUTES = [
  "/entrar",
  "/crear-cuenta",
  "/recuperar-contrasena",
  "/restablecer-contrasena",
  "/verificar-correo",
  "/cuenta",
  "/cuenta/pedidos",
  "/cuenta/pedidos/cualquiera",
];

const ACCOUNT_WORDS = /^(Entrar|Mi cuenta|Cuenta|Crear cuenta|Crear una cuenta|Comprar|Mis pedidos|Cerrar sesión)$/;
const PRIVATE_API = /\/api\/v1\/(auth|me|users|orders|payments)(\/|$)/;

/** Peticiones a las rutas de sesión, perfil, pedidos o pagos (no debe haber ninguna). */
function trackPrivateCalls(page: Page) {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (PRIVATE_API.test(new URL(request.url()).pathname)) calls.push(`${request.method()} ${request.url()}`);
  });
  return calls;
}

async function expectNoAccountUi(page: Page) {
  await expect(page.getByRole("link", { name: ACCOUNT_WORDS })).toHaveCount(0);
  await expect(page.getByRole("button", { name: ACCOUNT_WORDS })).toHaveCount(0);
  await expect(page.locator('a[href^="/cuenta"], a[href^="/entrar"], a[href^="/crear-cuenta"]')).toHaveCount(0);
}

test("ninguna pantalla pública enseña la cuenta ni la compra, ni llama a sus rutas", async ({ page }) => {
  const errors = trackErrors(page);
  const calls = trackPrivateCalls(page);
  const pages: { path: string; ready: string }[] = [
    { path: "/", ready: "Destacados" },
    { path: "/catalogo", ready: CASE.name },
    { path: CASE.collectionPath, ready: "El lote, paso a paso" },
    { path: NO_PRICE_COLLECTION.path, ready: "El lote, paso a paso" },
    { path: "/bodegas", ready: CASE.winery },
    { path: `/b/${CASE.lotCode}`, ready: "Reglas con las que se hizo el lote" },
    { path: "/b", ready: "Verifica una botella" },
  ];
  for (const { path, ready } of pages) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: ready }).first()).toBeVisible();
    await expectNoAccountUi(page);
  }
  // La navegación es la de la Ola 2: sin pestaña ni enlace de cuenta.
  await expect(shellNav(page).getByRole("link")).toHaveText(
    (page.viewportSize()?.width ?? 0) < 768
      ? ["Inicio", "Catálogo", "Verificar", "Bodegas"]
      : ["Catálogo", "Bodegas", "Verificar"],
  );
  await page.waitForLoadState("networkidle");
  expect(calls).toEqual([]);
  expect(errors).toEqual([]);
});

test("la ficha de una colección a la venta sigue con «Avísame», sin compra", async ({ page }) => {
  const calls = trackPrivateCalls(page);
  await page.goto(CASE.collectionPath);
  await expect(page.getByRole("heading", { level: 1, name: CASE.name })).toBeVisible();
  await expect(page.getByText("A la venta", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Avísame" })).toHaveAttribute(
    "href",
    "https://landing.ejemplo.test/lista-de-espera?src=marketplace",
  );
  await expect(page.getByRole("button", { name: /comprar|pagar|adquirir/i })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await axe(page)).toEqual([]);
  expect(calls).toEqual([]);
});

for (const path of ACCOUNT_ROUTES) {
  test(`${path} no existe (404)`, async ({ page, request }) => {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(404);
    const calls = trackPrivateCalls(page);
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Página no encontrada" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /Correo|Contraseña/ })).toHaveCount(0);
    await expectNoAccountUi(page);
    expect(calls).toEqual([]);
  });
}
