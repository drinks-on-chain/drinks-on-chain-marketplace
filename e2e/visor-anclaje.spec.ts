import { expect, test, type Page } from "@playwright/test";
import { publicFixtures } from "@drinks-on-chain/mocks/fixtures";
import { CASE, WINE_LOT, axe, expectNoHorizontalScroll, trackErrors } from "./support";

// 2E · Verificación del anclaje del expediente en la red (contrato de la Ola 3 §7.3, PUB-03):
// sin anclaje, pendiente y anclado. En «anclado» el visor descarga los bytes canónicos, recalcula
// su SHA-256 con WebCrypto en el navegador y muestra las cuatro comprobaciones del servidor.

const anchorOf = (lotCode: string) => publicFixtures.passports[lotCode]!.dossier.anchor!;
const section = (page: Page) => page.getByRole("region", { name: "Anclaje en la red" });

test("lote anclado: recálculo en el navegador, cuatro comprobaciones, cuenta y enlace del backend", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const anchor = anchorOf(CASE.lotCode);
  await page.goto(`/b/${CASE.lotCode}`);

  const region = section(page);
  await expect(region).toContainText("Anclado el");
  await expect(region).toContainText("red de pruebas de Stellar");
  // La huella se recalcula aquí, con los bytes descargados.
  await expect(region.getByText("La huella recalculada coincide")).toBeVisible();

  // Las cuatro comprobaciones, con palabra además del color.
  const checks = region.getByRole("list", { name: "Comprobaciones" }).getByRole("listitem");
  await expect(checks).toHaveCount(4);
  await expect(checks).toContainText([
    "El expediente está cerrado",
    "La red confirmó el anclaje",
    "El memo de la transacción coincide con la huella",
    "La cuenta de anclaje es la oficial de Drinks on Chain",
  ]);
  for (const check of await checks.all()) await expect(check.getByText("Cumple", { exact: true })).toBeVisible();
  await expect(region).toContainText("Comprobaciones hechas por el servidor de Drinks on Chain");

  // Cuenta de anclaje y transacción, abreviadas a la vista y enteras para copiar.
  await expect(region).toContainText("Cuenta de anclaje");
  await expect(region.getByRole("button", { name: /Copiar dirección/ })).toBeVisible();
  await expect(region.getByRole("button", { name: /Copiar hash/ })).toBeVisible();

  // El enlace a la transacción es, tal cual, el `explorerUrl` que entrega el backend.
  const link = region.getByRole("link", { name: /Ver la transacción en el explorador/ });
  await expect(link).toHaveAttribute("href", anchor.explorerUrl!);
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);

  // Los eventos nuevos de la línea de tiempo.
  const log = page.getByRole("region", { name: "Registro del lote" });
  await expect(log).toContainText("Expediente anclado en la red Stellar");

  await expectNoHorizontalScroll(page);
  expect(await axe(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test("botella de un lote anclado: su código y el anclaje se comprueban con una sola descarga", async ({ page }) => {
  const errors = trackErrors(page);
  const downloads: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith("/dossier")) downloads.push(request.url());
  });
  await page.goto(`/b/${CASE.bottle.code}`);
  await expect(page.getByText("Este código pertenece al expediente cerrado")).toBeVisible();
  await expect(section(page).getByText("La huella recalculada coincide")).toBeVisible();
  expect(downloads).toHaveLength(1);
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("anclaje pendiente: se dice, sin comprobaciones ni enlace", async ({ page }) => {
  const errors = trackErrors(page);
  const calls: string[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/verification") || path.endsWith("/dossier")) calls.push(path);
  });
  // El escenario deja «Singani Gran Reserva 2026» certificado, con el anclaje aún en la red.
  await page.goto(`/b/${CASE.lotCode}?mock=anclaje-pendiente`);
  const region = section(page);
  await expect(region).toContainText("Anclaje en la red: pendiente");
  await expect(region).toContainText("está en camino a la red de pruebas de Stellar");
  await expect(region).toContainText("Cuenta de anclaje");
  await expect(region.getByRole("link")).toHaveCount(0);
  await expect(region.getByText("Comprobaciones")).toHaveCount(0);
  await expect(region.getByText("La huella recalculada coincide")).toHaveCount(0);
  // Mientras no esté confirmado no se pide nada más.
  expect(calls).toEqual([]);
  expect(await axe(page)).toEqual([]);
  expect(errors).toEqual([]);
  await page.goto("/?mock=normal");
});

test("expediente abierto: sin anclaje, y no se consulta la verificación", async ({ page }) => {
  const errors = trackErrors(page);
  const calls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith("/verification")) calls.push(request.url());
  });
  await page.goto(`/b/${WINE_LOT}`);
  const region = section(page);
  await expect(region).toContainText("Sin anclaje");
  await expect(region).toContainText("El expediente de este lote sigue abierto");
  await expect(region.getByRole("link")).toHaveCount(0);
  expect(calls).toEqual([]);
  expect(errors).toEqual([]);
});

test("la huella no coincide (expediente alterado): se dice con claridad, con las huellas a la vista y reintento", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const lot = publicFixtures.passports[CASE.lotCode]!;
  // El escenario sirve un expediente con un dato cambiado: su SHA-256 ya no es la huella anclada.
  await page.goto(`/b/${CASE.lotCode}?mock=huella-alterada`);
  const region = section(page);
  const alert = region.getByRole("alert");
  await expect(alert).toContainText("La huella recalculada no coincide");
  await expect(alert).toContainText("no es la que publica el pasaporte ni la registrada en la red");
  // Las tres huellas, enteras, para compararlas.
  await expect(alert).toContainText("Huella calculada en tu dispositivo");
  await expect(alert).toContainText(lot.dossier.hash!);
  await expect(alert.locator("code")).toHaveCount(3);
  const computed = await alert.locator("code").first().textContent();
  expect(computed).toMatch(/^[0-9a-f]{64}$/);
  expect(computed).not.toBe(lot.dossier.hash);
  // Sin dramatizar: qué puede ser y qué hacer.
  await expect(alert).toContainText("Puede ser una descarga incompleta");
  await expect(alert.getByRole("button", { name: "Reintentar" })).toBeVisible();
  await expect(region.getByText("La huella recalculada coincide")).toHaveCount(0);
  // Lo que comprobó el servidor al confirmar el anclaje sigue a la vista, aparte.
  await expect(region.getByRole("list", { name: "Comprobaciones" }).getByRole("listitem")).toHaveCount(4);

  await expectNoHorizontalScroll(page);
  expect(await axe(page)).toEqual([]);
  expect(errors).toEqual([]);

  // Con el expediente intacto, «Reintentar» vuelve a descargar y ya coincide.
  await page.evaluate(() =>
    (window as unknown as { __docMocks: { setScenario(name: string): void } }).__docMocks.setScenario("normal"),
  );
  await alert.getByRole("button", { name: "Reintentar" }).click();
  await expect(region.getByText("La huella recalculada coincide")).toBeVisible();
});

test("botella con el expediente alterado: tampoco se da el código por comprobado", async ({ page }) => {
  await page.goto(`/b/${CASE.bottle.code}?mock=huella-alterada`);
  await expect(page.getByText("El expediente no coincide con su huella")).toBeVisible();
  await expect(page.getByText("Este código pertenece al expediente cerrado")).toHaveCount(0);
  await expect(section(page).getByRole("alert")).toContainText("La huella recalculada no coincide");
  await page.goto("/?mock=normal");
});

test("verificación que aún no existe (404): el visor muestra lo que deduce del pasaporte", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(`/b/${CASE.lotCode}?mock=verificacion-no-encontrada`);
  const region = section(page);
  // El recálculo en el navegador no depende de esa ruta.
  await expect(region.getByText("La huella recalculada coincide")).toBeVisible();
  const checks = region.getByRole("list", { name: "Comprobaciones" }).getByRole("listitem");
  await expect(checks).toHaveCount(4);
  await expect(checks.nth(0)).toContainText("Cumple");
  await expect(checks.nth(1)).toContainText("Cumple");
  await expect(checks.nth(2)).toContainText("Cumple");
  // La cuenta oficial solo la puede confirmar el servidor.
  await expect(checks.nth(3)).toContainText("No se puede comprobar aquí");
  await expect(region).toContainText("El servicio de verificación aún no está disponible");
  await expect(region.getByText(/Comprobaciones hechas por el servidor/)).toHaveCount(0);
  // El enlace del backend sigue ahí; no hay ningún mensaje de error.
  await expect(region.getByRole("link", { name: /Ver la transacción en el explorador/ })).toBeVisible();
  await expect(region.getByRole("alert")).toHaveCount(0);
  expect(await axe(page)).toEqual([]);
  expect(errors).toEqual([]);
  await page.goto("/?mock=normal");
});
