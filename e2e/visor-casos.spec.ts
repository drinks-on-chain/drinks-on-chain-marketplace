import { expect, test } from "@playwright/test";
import { CASE, CASES, expectNoHorizontalScroll, firstBottleOf, trackErrors } from "./support";

// 2E · Avisos del visor con los casos de los fixtures (`PASSPORT_CASES` de los mocks 0.5.0-rc.2):
// bodega suspendida, lote retirado, D.O. por excepción legal, laboratorio no conforme, registro
// tardío y el límite de 60 consultas por minuto (escenario `pasaporte-saturado`).

const alerts = (page: import("@playwright/test").Page) => page.getByRole("main").getByRole("alert");

test("bodega suspendida: el pasaporte sigue visible, con aviso y sin enlace a la bodega", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(`/b/${CASES.wineryInactive}`);
  await expect(page.getByText("Esta etiqueta identifica el lote")).toBeVisible();

  const notice = alerts(page).filter({ hasText: "Esta bodega no está activa en la red" });
  await expect(notice).toContainText("El registro del lote se conserva tal como quedó.");
  // La bodega aparece por su nombre, pero su página ya no existe: no se enlaza.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Ver la página de / })).toHaveCount(0);
  // El resto del pasaporte está entero.
  await expect(page.getByRole("region", { name: "Laboratorio" })).toContainText("Conforme");
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("lote retirado: aviso en el lote y código anulado en sus botellas", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(`/b/${CASES.discarded}`);
  const discarded = alerts(page).filter({ hasText: "La bodega retiró este lote" });
  await expect(discarded).toContainText("Su registro sigue visible para que conste su historia.");
  await expect(page.getByText("Esta etiqueta identifica el lote")).toBeVisible();

  // Sus botellas quedan anuladas: los dos avisos, y nunca "verificada".
  const bottle = firstBottleOf(CASES.discarded);
  expect(bottle.status).toBe("VOIDED");
  await page.goto(`/b/${bottle.code}`);
  await expect(alerts(page).filter({ hasText: "Este código fue anulado por la bodega" })).toBeVisible();
  await expect(alerts(page).filter({ hasText: "La bodega retiró este lote" })).toBeVisible();
  await expect(page.getByText("Este código pertenece al expediente cerrado")).toHaveCount(0);
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("D.O. por excepción legal y registro tardío", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(`/b/${CASES.doByException}`);
  const origin = page.getByRole("region", { name: "Origen" });
  await expect(origin).toContainText("Cumple por excepción legal");
  await expect(origin).toContainText("por una excepción legal autorizada");
  await expect(origin).toContainText("Apta por excepción");
  // La regla que se aplicó al lote es la de la excepción (1.500 m), y se dice.
  await expect(origin).toContainText("parcelas a 1.500 m s. n. m. o más");
  await expect(page.getByRole("region", { name: "Reglas con las que se hizo el lote" })).toContainText(
    "Excepción legal",
  );

  // Registro tardío: se ve cuándo ocurrió y cuándo se anotó.
  const log = page.getByRole("region", { name: "Registro del lote" });
  await expect(log.getByRole("listitem").first()).toContainText(/Anotado después, el \d+ \w+ \d{4}/);
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("laboratorio no conforme: se dice, con el parámetro que falla", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(`/b/${CASES.labNonConforming}`);
  const lab = page.getByRole("region", { name: "Laboratorio" });
  await expect(lab).toContainText("No conforme");
  const volatile = lab.getByRole("listitem").filter({ hasText: "Acidez volátil" });
  await expect(volatile).toContainText("No cumple");
  await expect(volatile).toContainText(/máx\. [\d,]+ g\/l/);
  await expect(lab.getByRole("listitem").filter({ hasText: "Grado alcohólico" })).toContainText("Cumple");
  // Con el laboratorio no conforme el expediente no se cierra.
  await expect(page.getByRole("region", { name: "Expediente del lote" })).toContainText("Expediente abierto");
  expect(errors).toEqual([]);
});

test("límite de consultas por minuto (pasaporte saturado): pide esperar y deja reintentar", async ({ page }) => {
  const errors = trackErrors(page);
  // El escenario de los mocks se elige con `?mock=` y queda guardado para la sesión.
  await page.goto(`/b/${CASE.bottle.code}?mock=pasaporte-saturado`);
  const limited = alerts(page).filter({ hasText: "Demasiados intentos" });
  await expect(limited).toContainText("Por seguridad, espera 1 minuto antes de volver a intentarlo.");
  await expect(page.getByText(/Botella n\.º/)).toHaveCount(0);
  await expect(page.locator('meta[name="robots"][content="noindex"]')).toHaveCount(1);

  // Reintentar mientras dura la saturación sigue frenado; al pasar, el pasaporte vuelve.
  await limited.getByRole("button", { name: "Reintentar" }).click();
  await expect(limited).toContainText("Demasiados intentos");
  await page.goto(`/b/${CASE.bottle.code}?mock=normal`);
  await expect(page.getByText(`Botella n.º 1 de ${CASE.total}`)).toBeVisible();
  expect(errors).toEqual([]);
});

test("un lote saturado tampoco se muestra a medias", async ({ page }) => {
  await page.goto(`/b/${CASE.lotCode}?mock=pasaporte-saturado`);
  await expect(alerts(page).filter({ hasText: "Demasiados intentos" })).toBeVisible();
  await expect(page.getByText("Esta etiqueta identifica el lote")).toHaveCount(0);
});
