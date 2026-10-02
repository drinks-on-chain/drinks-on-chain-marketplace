import { expect, test } from "@playwright/test";
import {
  BOTTLE,
  BOTTLE_TYPO,
  LOT,
  codeField,
  expectNoHorizontalScroll,
  fieldError,
  trackErrors,
  verifyButton,
} from "./support";

// Visor `/b/{código}` sin datos todavía (O2-MK-1, fase 1): entrada manual, normalización y
// validación del código (§7.1), estados y redirecciones. Con los mocks 0.4 no existe el dominio
// `public`, así que un código bien escrito acaba en "no encontrado".

test("entrada válida: normaliza el código y abre el visor", async ({ page }) => {
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

test("las confusiones O/0 e I/L/1 se resuelven solas", async ({ page }) => {
  await page.goto("/b");
  // D0Q8B5S1 escrito con O y con L.
  await codeField(page).fill("doq8 b5sl");
  await codeField(page).press("Enter");
  await expect(page).toHaveURL(/\/b\/D0Q8B5S1$/);
  await expect(page.getByRole("heading", { level: 1, name: "D0Q8-B5S1" })).toBeVisible();
});

test("el código de lote también abre el visor", async ({ page }) => {
  await page.goto("/b");
  await codeField(page).fill("cvj-2026-singani-004");
  await verifyButton(page).click();
  await expect(page).toHaveURL(new RegExp(`/b/${LOT}$`));
  await expect(page.getByRole("heading", { level: 1, name: LOT })).toBeVisible();
  await expect(page.getByText("Código de lote", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No encontramos este código" })).toBeVisible();
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

  // Se corrige ahí mismo.
  await field.fill(BOTTLE.formatted);
  await verifyButton(page).click();
  await expect(page).toHaveURL(new RegExp(`/b/${BOTTLE.code}$`));
  await expect(page.getByRole("heading", { level: 1, name: BOTTLE.formatted })).toBeVisible();
  expect(errors).toEqual([]);
});

test("el visor redirige a la forma canónica del código", async ({ page }) => {
  // El 308 lo da el servidor al pintar la página; con mocks, `MocksGate` no pinta la página en el
  // servidor y la redirección ocurre en el navegador. Aquí se comprueba el resultado.
  for (const written of ["k7m2-q9xm", "K7M2-Q9XM", "k7m2%20q9xm"]) {
    await page.goto(`/b/${written}`);
    await expect(page).toHaveURL(new RegExp(`/b/${BOTTLE.code}$`));
    await expect(page.getByRole("heading", { level: 1, name: BOTTLE.formatted })).toBeVisible();
  }
});

test("/trace/batch/{lote} redirige con 308 a /b/{lote}", async ({ page, request }) => {
  const response = await request.get(`/trace/batch/${LOT}`, { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe(`/b/${LOT}`);

  // En el navegador, también con el código en minúsculas: acaba en la URL canónica.
  await page.goto("/trace/batch/cvj-2026-singani-004");
  await expect(page).toHaveURL(new RegExp(`/b/${LOT}$`));
  await expect(page.getByRole("heading", { level: 1, name: LOT })).toBeVisible();
  await expect(page.getByText("Código de lote", { exact: true })).toBeVisible();
});

test("el visor no se indexa", async ({ page }) => {
  await page.goto(`/b/${BOTTLE.code}`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page).toHaveTitle(`Código de botella ${BOTTLE.formatted} · Drinks on Chain`);
});
