import { expect, test } from "@playwright/test";
import {
  BOTTLE,
  BOTTLE_TYPO,
  CASE,
  WINE_LOT,
  codeField,
  expectNoHorizontalScroll,
  fieldError,
  missingCodes,
  trackErrors,
  verifyButton,
} from "./support";

// 2E · Visor `/b/{código}` contra el dominio público de los mocks (contrato de la Ola 2 §12.5):
// entrada manual y validación del código (§7.1), pasaporte de botella y de lote, avisos, estados
// (no encontrado, mal escrito, demasiados intentos) y redirecciones.

test("botella: serie N de M, lote, bodega y comprobación contra el expediente cerrado", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await codeField(page).fill(CASE.bottle.formatted.toLowerCase());
  await verifyButton(page).click();

  await expect(page).toHaveURL(new RegExp(`/b/${CASE.bottle.code}$`));
  await expect(page.getByRole("heading", { level: 1, name: CASE.name })).toBeVisible();
  await expect(page.getByText("Singani · Añada 2026")).toBeVisible();
  await expect(page.getByText(`Botella n.º 1 de ${CASE.total}`)).toBeVisible();
  await expect(page.getByRole("main").getByText(CASE.bottle.formatted, { exact: true })).toBeVisible();

  // La prueba Merkle se comprueba en el navegador contra el expediente descargado.
  await expect(page.getByText("Este código pertenece al expediente cerrado")).toBeVisible();

  // Expediente: cerrado, con su huella abreviada.
  const dossier = page.getByRole("region", { name: "Expediente del lote" });
  await expect(dossier).toContainText("Expediente cerrado el");
  await expect(dossier.locator("code").first()).toHaveText(/^[0-9a-f]{8}…[0-9a-f]{8}$/);

  // Roles, no nombres; y las correcciones, contadas.
  const log = page.getByRole("region", { name: "Registro del lote" });
  await expect(log.getByRole("listitem").first()).toContainText("Operación de bodega");
  await expect(log).toContainText("1 corrección registrada");
  await expect(page.getByRole("main")).not.toContainText(/Lic\.|Ing\.|@/);

  // Laboratorio y D.O.
  await expect(page.getByRole("region", { name: "Laboratorio" })).toContainText("Conforme");
  await expect(page.getByRole("region", { name: "Origen" })).toContainText("Cumple la Denominación de Origen");

  // No hay precio, reseñas ni compra en el visor.
  await expect(page.getByRole("main")).not.toContainText(/Bs\s\d/);
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("de la botella a su lote y de vuelta", async ({ page }) => {
  await page.goto(`/b/${CASE.bottle.code}`);
  await page.getByRole("link", { name: "Ver el lote completo" }).click();
  await expect(page).toHaveURL(new RegExp(`/b/${CASE.lotCode}\\?desde=${CASE.bottle.code}$`));
  await expect(page.getByText("Esta etiqueta identifica el lote")).toBeVisible();
  await expect(page.getByText(/Botella n\.º/)).toHaveCount(0);

  await page.getByRole("link", { name: `Volver a tu botella ${CASE.bottle.code}` }).click();
  await expect(page).toHaveURL(new RegExp(`/b/${CASE.bottle.code}$`));
  await expect(page.getByText(`Botella n.º 1 de ${CASE.total}`)).toBeVisible();

  // De la botella a la página de la bodega.
  await page.getByRole("link", { name: `Ver la página de ${CASE.winery}` }).click();
  await expect(page).toHaveURL(new RegExp(`/bodegas/${CASE.winerySlug}$`));
});

test("código anulado: aviso destacado", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(`/b/${CASE.voided.code}`);
  await expect(page.getByText(`Botella n.º ${CASE.voided.serial} de ${CASE.total}`)).toBeVisible();
  const alert = page.getByRole("main").getByRole("alert").filter({ hasText: "anulado" });
  await expect(alert).toContainText("Este código fue anulado por la bodega");
  await expect(alert).toContainText("avisa a la bodega");
  // Un código anulado no se da por verificado.
  await expect(page.getByText("Este código pertenece al expediente cerrado")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("lote: lo que no está registrado se dice, no se inventa", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/b");
  await codeField(page).fill(WINE_LOT.toLowerCase());
  await verifyButton(page).click();
  await expect(page).toHaveURL(new RegExp(`/b/${WINE_LOT}$`));
  await expect(page.getByText("Esta etiqueta identifica el lote")).toBeVisible();
  await expect(page.getByText("Vino · Añada 2025")).toBeVisible();

  const lab = page.getByRole("region", { name: "Laboratorio" });
  await expect(lab).toContainText("No registrado");
  await expect(lab).toContainText("La bodega no registró un análisis de laboratorio de este lote.");

  const dossier = page.getByRole("region", { name: "Expediente del lote" });
  await expect(dossier).toContainText("Expediente abierto");
  await expect(dossier.getByRole("button", { name: "Descargar expediente" })).toHaveCount(0);

  // Un vino no lleva D.O. ni destilación; sí crianza.
  await expect(page.getByRole("region", { name: "Origen" })).toContainText(
    "Este producto no lleva Denominación de Origen.",
  );
  const process = page.getByRole("region", { name: "Elaboración" });
  await expect(process.getByRole("heading", { name: "Crianza" })).toBeVisible();
  await expect(process.getByRole("heading", { name: "Destilación y reposo" })).toHaveCount(0);
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("el expediente cerrado se descarga como JSON", async ({ page }) => {
  await page.goto(`/b/${CASE.lotCode}`);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar expediente" }).click();
  expect((await download).suggestedFilename()).toBe(`expediente-${CASE.lotCode}.json`);
});

test("código bien escrito que no existe: no encontrado, con salida", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await codeField(page).fill("k7m2-q9xm");
  await verifyButton(page).click();

  await expect(page).toHaveURL(new RegExp(`/b/${BOTTLE.code}$`));
  await expect(page.getByRole("heading", { level: 1, name: BOTTLE.formatted })).toBeVisible();
  await expect(page.getByText("Código de botella", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No encontramos este código" })).toBeVisible();
  // Desde ahí se puede probar otro código.
  await expect(codeField(page)).toHaveValue("");
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("demasiados intentos: tras muchos códigos inexistentes, el visor pide esperar", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/b");
  await expect(codeField(page)).toBeVisible();

  // El freno a la enumeración (§12.4): más de 20 códigos inexistentes en 10 minutos desde una IP.
  // Se consumen aquí, en la misma página (el contador de los mocks vive en ella).
  const statuses = await page.evaluate(async (codes) => {
    const out: number[] = [];
    for (const code of codes) out.push((await fetch(`/api/v1/public/passports/${code}`)).status);
    return out;
  }, missingCodes(21));
  expect(new Set(statuses)).toEqual(new Set([404]));

  // El siguiente, aunque exista, ya no se resuelve.
  await codeField(page).fill(CASE.bottle.code);
  await verifyButton(page).click();
  await expect(page).toHaveURL(new RegExp(`/b/${CASE.bottle.code}$`));
  const limited = page.getByRole("main").getByRole("alert").filter({ hasText: "Demasiados intentos" });
  await expect(limited).toContainText("Por seguridad, espera 10 minutos antes de volver a intentarlo.");
  await expect(page.getByText(/Botella n\.º/)).toHaveCount(0);
  // No se ofrece probar otro código mientras dura el freno; reintentar sigue frenado.
  await expect(codeField(page)).toHaveCount(0);
  await limited.getByRole("button", { name: "Reintentar" }).click();
  await expect(limited).toContainText("Demasiados intentos");
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("las confusiones O/0 e I/L/1 se resuelven solas", async ({ page }) => {
  await page.goto("/b");
  // D0Q8B5S1 escrito con O y con L.
  await codeField(page).fill("doq8 b5sl");
  await codeField(page).press("Enter");
  await expect(page).toHaveURL(/\/b\/D0Q8B5S1$/);
  await expect(page.getByRole("heading", { level: 1, name: "D0Q8-B5S1" })).toBeVisible();
});

test("entrada mal escrita: error asociado al campo, foco y sugerencia", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  const field = codeField(page);

  // Vacío.
  await verifyButton(page).click();
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(field).toBeFocused();
  await expect(fieldError(page)).toHaveText("Escribe el código que aparece en la etiqueta.");
  await expect(page).toHaveURL(/\/$/);

  // Corto: dice cuántos caracteres hay.
  await field.fill("K7M2-Q9X");
  await expect(fieldError(page)).toHaveCount(0);
  await field.press("Enter");
  await expect(fieldError(page)).toContainText("El código tiene 8 caracteres y escribiste 7.");
  const describedBy = await field.getAttribute("aria-describedby");
  const errorId = await fieldError(page).locator("xpath=..").getAttribute("id");
  expect(describedBy?.split(" ")).toContain(errorId);

  // Un carácter cambiado por uno parecido: se ofrece la corrección.
  await field.fill(BOTTLE_TYPO);
  await field.press("Enter");
  await expect(fieldError(page)).toContainText("Ese código no es válido");
  await expect(field).toBeFocused();
  await expectNoHorizontalScroll(page);
  await page.getByRole("button", { name: `Usar ${BOTTLE.formatted}` }).click();
  await expect(page).toHaveURL(new RegExp(`/b/${BOTTLE.code}$`));
  expect(errors).toEqual([]);
});

test("una URL con el código mal escrito abre el formulario con el motivo", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/b/K7MZ-Q9XM");
  await expect(page).toHaveURL(/\/b\/K7MZ-Q9XM$/);
  await expect(page.getByRole("heading", { level: 1, name: "Este código está mal escrito" })).toBeVisible();
  const field = codeField(page);
  await expect(field).toHaveValue("K7MZ-Q9XM");
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(fieldError(page)).toContainText("Ese código no es válido");
  await expect(page.getByRole("button", { name: `Usar ${BOTTLE.formatted}` })).toBeVisible();

  // Se corrige ahí mismo, con un código que sí existe.
  await field.fill(CASE.bottle.formatted);
  await verifyButton(page).click();
  await expect(page).toHaveURL(new RegExp(`/b/${CASE.bottle.code}$`));
  await expect(page.getByText(`Botella n.º 1 de ${CASE.total}`)).toBeVisible();
  expect(errors).toEqual([]);
});

test("el visor redirige a la forma canónica del código", async ({ page }) => {
  // El 308 lo da el servidor al pintar la página; con mocks, `MocksGate` no pinta la página en el
  // servidor y la redirección ocurre en el navegador. Aquí se comprueba el resultado.
  const written = CASE.bottle.formatted.toLowerCase();
  for (const path of [written, CASE.bottle.formatted, written.replace("-", "%20")]) {
    await page.goto(`/b/${path}`);
    await expect(page).toHaveURL(new RegExp(`/b/${CASE.bottle.code}$`));
    await expect(page.getByText(`Botella n.º 1 de ${CASE.total}`)).toBeVisible();
  }
});

test("/trace/batch/{lote} redirige con 308 a /b/{lote}", async ({ page, request }) => {
  const response = await request.get(`/trace/batch/${CASE.lotCode}`, { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe(`/b/${CASE.lotCode}`);

  // En el navegador, también con el código en minúsculas: acaba en la URL canónica.
  await page.goto(`/trace/batch/${CASE.lotCode.toLowerCase()}`);
  await expect(page).toHaveURL(new RegExp(`/b/${CASE.lotCode}$`));
  await expect(page.getByRole("heading", { level: 1, name: CASE.name })).toBeVisible();
  await expect(page.getByText("Esta etiqueta identifica el lote")).toBeVisible();
});

test("títulos del visor: la botella nunca se indexa", async ({ page }) => {
  await page.goto(`/b/${CASE.bottle.code}`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page).toHaveTitle(`Código de botella ${CASE.bottle.formatted} · Drinks on Chain`);
  await page.goto(`/b/${CASE.lotCode}`);
  await expect(page).toHaveTitle(`Código de lote ${CASE.lotCode} · Drinks on Chain`);
});
