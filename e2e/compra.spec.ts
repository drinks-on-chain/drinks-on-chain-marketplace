import { expect, test, type Page } from "@playwright/test";
import { CASE, NO_PRICE_COLLECTION, axe, expectNoHorizontalScroll, trackErrors } from "./support";
import { CONSUMER, NEW_PASSWORD, fillSignup, login, signup } from "./support-cuenta";

// 2C · Compra contra los mocks del borrador de la Etapa 4 (bandera `NEXT_PUBLIC_MK_ACCOUNT=1`):
// `CheckoutSheet` (cantidad → pago → confirmación), cuenta dentro del flujo, pasarela de prueba,
// «pago recibido» explícito antes de enseñar los NFT (A-23), historial, pago fallido y reserva
// caducada. Los pedidos de los mocks viven en memoria: dentro de cada prueba se navega sin recargar.

const sheet = (page: Page) => page.getByRole("dialog", { name: `Comprar · ${CASE.name}` });
const quantity = (page: Page) => sheet(page).getByRole("textbox", { name: /Cantidad de botellas/ });

async function openCheckout(page: Page) {
  await page.goto(CASE.collectionPath);
  await page.getByRole("button", { name: "Comprar", exact: true }).click();
  await expect(sheet(page)).toBeVisible();
}

/** Entra con la consumidora de demostración y vuelve a la ficha sin recargar. */
async function loggedInAtCollection(page: Page) {
  await page.goto(`/entrar?volver=${encodeURIComponent(CASE.collectionPath)}`);
  await login(page);
  await expect(page).toHaveURL(new RegExp(`${CASE.collectionPath}$`));
  await page.getByRole("button", { name: "Comprar", exact: true }).click();
  await expect(sheet(page)).toBeVisible();
}

test("comprar sin sesión: la cuenta se abre dentro del flujo y el pago recibido va antes que las botellas", async ({
  page,
}) => {
  // Recorrido largo, con varias auditorías axe: tres veces el tiempo por prueba.
  test.slow();
  const errors = trackErrors(page);
  await openCheckout(page);
  const dialog = sheet(page);

  // Paso 1 · cantidad, con el total en bolivianos.
  await expect(dialog.getByRole("heading", { name: "¿Cuántas botellas?" })).toBeVisible();
  // El máximo por compra y los minutos de reserva llegan de la configuración pública.
  await expect(dialog.getByText("Hay 60 disponibles. Hasta 10 botellas por pedido.")).toBeVisible();
  await expect(dialog.getByText("Al continuar apartamos tus botellas 30 minutos, mientras pagas.")).toBeVisible();
  await dialog.getByRole("button", { name: "Añadir una botella" }).click();
  await expect(quantity(page)).toHaveValue("2");
  await expect(dialog.getByText(/^Bs\s560$/)).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await dialog.getByRole("button", { name: "Continuar al pago" }).click();

  // Sin sesión: 2B dentro de la misma hoja.
  await expect(dialog.getByRole("heading", { name: "Entra para continuar" })).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await login(page);

  // Paso 2 · pago: el pedido aparta las botellas y la pasarela es de prueba.
  const gateway = dialog.getByRole("region", { name: "Pasarela de prueba" });
  await expect(gateway).toContainText("no se cobra nada");
  await expect(dialog.getByText(/Guardamos tus botellas hasta las \d{2}:\d{2} \(hora de Bolivia\)\./)).toBeVisible();
  await expect(dialog.getByText(/2 × Singani Gran Reserva 2026/)).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await expectNoHorizontalScroll(page);

  // Demorar: sigue esperando, sin botellas.
  await gateway.getByRole("button", { name: "Demorar la respuesta" }).click();
  await expect(gateway.getByText(/La pasarela todavía no respondió/)).toBeVisible();
  await expect(dialog.getByText("Pago recibido")).toHaveCount(0);
  await expect(dialog.getByText(/Botella \d+ de 60/)).toHaveCount(0);

  // Aprobar: «Pago recibido», explícito, y todavía ninguna botella a la vista (A-23).
  await gateway.getByRole("button", { name: "Aprobar el pago" }).click();
  await expect(dialog.getByRole("heading", { name: "Pago recibido" })).toBeVisible();
  await expect(dialog.getByText(/Recibimos tu pago de Bs\s560\./)).toBeVisible();
  await expect(dialog.getByText(/Botella \d+ de 60/)).toHaveCount(0);
  await expect(dialog.getByText(/NFT n\.º/)).toHaveCount(0);
  expect(await axe(page)).toEqual([]);

  // Paso 3 · las botellas, cuando la persona las pide.
  await dialog.getByRole("button", { name: "Ver mis botellas" }).click();
  const bottles = dialog.getByRole("list", { name: "Tus botellas" }).getByRole("listitem");
  await expect(bottles).toHaveCount(2);
  await expect(bottles.first()).toContainText(/Botella \d+ de 60/);
  await expect(bottles.first()).toContainText(/NFT n\.º \d+/);
  // El borrador no adelanta la entrega en la red: se dice, no se inventa una transacción.
  await expect(bottles.first()).toContainText("Entrega en la red: pendiente");
  await expect(dialog.getByRole("link", { name: /explorador/i })).toHaveCount(0);
  expect(await axe(page)).toEqual([]);

  // El pedido queda en el historial.
  await dialog.getByRole("link", { name: "Ver el pedido" }).click();
  await expect(page).toHaveURL(/\/cuenta\/pedidos\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: CASE.name })).toBeVisible();
  await expect(page.getByRole("main").getByRole("status").filter({ hasText: "Pago recibido" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Tus botellas" }).getByRole("listitem")).toHaveCount(2);
  expect(await axe(page)).toEqual([]);
  await expectNoHorizontalScroll(page);

  await page.getByRole("link", { name: "Volver a mis pedidos" }).click();
  await expect(page).toHaveURL(/\/cuenta\/pedidos$/);
  const row = page.getByRole("article").filter({ hasText: CASE.name });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Pago recibido");
  await expect(row).toContainText("2 botellas");
  await expect(row).toContainText(/Bs\s560/);
  expect(await axe(page)).toEqual([]);

  // La ficha descuenta las botellas vendidas.
  await row.getByRole("link").click();
  await page.getByRole("link", { name: "Ver la colección" }).click();
  await expect(page.getByText("Quedan 58 de 60 botellas")).toBeVisible();
  expect(errors).toEqual([]);
});

test("máximo por compra conocido de antemano; pago rechazado y nuevo intento", async ({ page }) => {
  // Recorrido largo, con varias auditorías axe: tres veces el tiempo por prueba.
  test.slow();
  const errors = trackErrors(page);
  await loggedInAtCollection(page);
  const dialog = sheet(page);

  // Una cantidad que no es un número entero válido.
  await quantity(page).fill("0");
  await dialog.getByRole("button", { name: "Continuar al pago" }).click();
  await expect(dialog.getByText("Escribe un número entre 1 y 10.")).toBeVisible();

  // Más del máximo por compra: el formulario ya lo sabe (`purchase-settings`) y no llega a pedirlo.
  await expect(dialog.getByText("Hay 60 disponibles. Hasta 10 botellas por pedido.")).toBeVisible();
  await quantity(page).fill("11");
  await dialog.getByRole("button", { name: "Continuar al pago" }).click();
  await expect(dialog.getByText("Escribe un número entre 1 y 10.")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Añadir una botella" })).toBeDisabled();
  expect(await axe(page)).toEqual([]);

  await quantity(page).fill("10");
  await expect(dialog.getByText(/^Bs\s2\.800$/)).toBeVisible();
  await dialog.getByRole("button", { name: "Continuar al pago" }).click();

  // La pasarela rechaza: no se cobra, no hay botellas y se puede volver a intentar.
  await dialog.getByRole("button", { name: "Rechazar el pago" }).click();
  await expect(dialog.getByRole("heading", { name: "El pago no se completó" })).toBeVisible();
  await expect(dialog.getByRole("alert")).toContainText("No se cobró nada");
  await expect(dialog.getByText(/Botella \d+ de 60/)).toHaveCount(0);
  expect(await axe(page)).toEqual([]);
  await dialog.getByRole("button", { name: "Intentar de nuevo" }).click();
  await expect(dialog.getByRole("heading", { name: "¿Cuántas botellas?" })).toBeVisible();

  // Cerrar con Escape devuelve el foco al botón que abrió la hoja.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Comprar", exact: true })).toBeFocused();
  // Las botellas del pedido rechazado volvieron a estar disponibles.
  await expect(page.getByText("Quedan 60 de 60 botellas")).toBeVisible();
  expect(errors).toEqual([]);
});

test("reserva caducada: se dice y se puede empezar de nuevo; el pedido queda en el historial", async ({ page }) => {
  // Recorrido largo, con varias auditorías axe: tres veces el tiempo por prueba.
  test.slow();
  const errors = trackErrors(page);
  await loggedInAtCollection(page);
  const dialog = sheet(page);
  await dialog.getByRole("button", { name: "Continuar al pago" }).click();
  await expect(dialog.getByRole("region", { name: "Pasarela de prueba" })).toBeVisible();

  // Pasa el tiempo de la reserva (reloj de los mocks) sin que llegue el pago.
  await page.evaluate(() =>
    (window as unknown as { __docMocks: { advanceClock(ms: number): void } }).__docMocks.advanceClock(31 * 60_000),
  );
  await expect(dialog.getByRole("heading", { name: "La reserva caducó" })).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByRole("alert")).toContainText("las botellas volvieron a estar disponibles");
  expect(await axe(page)).toEqual([]);
  await dialog.getByRole("button", { name: "Empezar de nuevo" }).click();
  await expect(dialog.getByRole("heading", { name: "¿Cuántas botellas?" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page
    .getByRole("link", { name: /^(Mi cuenta|Cuenta)$/ })
    .first()
    .click();
  await page.getByRole("link", { name: /Mis pedidos/ }).click();
  const row = page.getByRole("article").filter({ hasText: CASE.name });
  await expect(row).toContainText("Reserva caducada");
  await row.getByRole("link").click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("La reserva caducó");
  await expect(page.getByRole("list", { name: "Tus botellas" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("un pedido que espera el pago se puede pagar después, desde «Mis pedidos»", async ({ page }) => {
  await loggedInAtCollection(page);
  const dialog = sheet(page);
  await dialog.getByRole("button", { name: "Continuar al pago" }).click();
  await expect(dialog.getByRole("region", { name: "Pasarela de prueba" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page
    .getByRole("link", { name: /^(Mi cuenta|Cuenta)$/ })
    .first()
    .click();
  await page.getByRole("link", { name: /Mis pedidos/ }).click();
  const row = page.getByRole("article").filter({ hasText: CASE.name });
  await expect(row).toContainText("Esperando el pago");
  await row.getByRole("link").click();
  await page.getByRole("button", { name: "Aprobar el pago" }).click();
  await expect(page.getByRole("main").getByRole("status").filter({ hasText: "Pago recibido" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Tus botellas" }).getByRole("listitem")).toHaveCount(1);
});

test("cuenta nueva creada dentro de la compra: entra en la hoja y sigue hasta el pago", async ({ page }) => {
  test.slow();
  const email = `compra.${test.info().project.name}@ejemplo.test`;
  await openCheckout(page);
  const dialog = sheet(page);
  await dialog.getByRole("button", { name: "Continuar al pago" }).click();
  await dialog.getByRole("button", { name: "Crear una cuenta" }).click();
  await expect(dialog.getByRole("checkbox", { name: /mayor de 18 años/ })).toBeVisible();
  expect(await axe(page)).toEqual([]);
  // El alta pide confirmar el correo; la hoja lo dice y deja entrar sin perder el pedido.
  await fillSignup(page, email);
  await expect(dialog.getByText(`Te enviamos un enlace a ${email}`, { exact: false })).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await dialog.getByRole("button", { name: "Entrar con mi cuenta" }).click();
  await login(page, { email, password: NEW_PASSWORD });
  await expect(dialog.getByRole("region", { name: "Pasarela de prueba" })).toBeVisible();
});

test("sin precio o agotada no se puede comprar: «Precio por anunciar» y «Avísame»", async ({ page }) => {
  await page.goto(NO_PRICE_COLLECTION.path);
  await expect(page.getByText("Precio por anunciar")).toBeVisible();
  await expect(page.getByRole("button", { name: "Comprar", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Avísame" })).toBeVisible();

  await page.goto("/colecciones/destileria-cinti-viejo/vino-las-carreras-2025");
  await expect(page.getByText("Sin botellas disponibles")).toBeVisible();
  await expect(page.getByRole("button", { name: "Comprar", exact: true })).toHaveCount(0);
});

test("historial vacío y pedido que no existe", async ({ page }) => {
  const errors = trackErrors(page);
  await signup(page, `sin.pedidos.${test.info().project.name}@ejemplo.test`);
  await page.getByRole("link", { name: /Mis pedidos/ }).click();
  await expect(page).toHaveURL(/\/cuenta\/pedidos$/);
  await expect(page.getByRole("heading", { name: "Aún no tienes pedidos" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver el catálogo" })).toHaveAttribute("href", "/catalogo");
  expect(await axe(page)).toEqual([]);
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("los pedidos piden entrar a quien no tiene sesión", async ({ page }) => {
  await page.goto("/cuenta/pedidos");
  await expect(page.getByRole("heading", { level: 1, name: "Entra para continuar" })).toBeVisible();
  await login(page, CONSUMER);
  await expect(page.getByRole("heading", { level: 1, name: "Mis pedidos" })).toBeVisible();
});
