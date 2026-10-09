import { expect, test } from "@playwright/test";
import {
  BOTTLE,
  CASE,
  CASES,
  CATALOG,
  NO_PRICE_COLLECTION,
  WINE_LOT,
  axe,
  codeField,
  fieldError,
  hasVisibleFocus,
  trackErrors,
} from "./support";

// 2F · Teclado completo, foco visible y auditoría axe sin violaciones serias, a 390 y a 1280 px.

const PAGES: { name: string; path: string; ready: string }[] = [
  { name: "portada", path: "/", ready: "Destacados" },
  { name: "verificar", path: "/b", ready: "Verifica una botella" },
  { name: "pasaporte de botella", path: `/b/${CASE.bottle.code}`, ready: "Reglas con las que se hizo el lote" },
  { name: "pasaporte de lote", path: `/b/${WINE_LOT}`, ready: "Reglas con las que se hizo el lote" },
  { name: "código anulado", path: `/b/${CASE.voided.code}`, ready: "Reglas con las que se hizo el lote" },
  { name: "bodega suspendida", path: `/b/${CASES.wineryInactive}`, ready: "Reglas con las que se hizo el lote" },
  { name: "lote retirado", path: `/b/${CASES.discarded}`, ready: "Reglas con las que se hizo el lote" },
  {
    name: "laboratorio no conforme",
    path: `/b/${CASES.labNonConforming}`,
    ready: "Reglas con las que se hizo el lote",
  },
  { name: "D.O. por excepción", path: `/b/${CASES.doByException}`, ready: "Reglas con las que se hizo el lote" },
  { name: "visor (no encontrado)", path: `/b/${BOTTLE.code}`, ready: "No encontramos este código" },
  { name: "visor (mal escrito)", path: "/b/K7MZ-Q9XM", ready: "Este código está mal escrito" },
  { name: "catálogo", path: "/catalogo", ready: CASE.name },
  { name: "ficha de colección", path: `/colecciones/${CASE.collectionSlug}`, ready: "El lote, paso a paso" },
  { name: "ficha sin precio", path: `/colecciones/${NO_PRICE_COLLECTION.slug}`, ready: "El lote, paso a paso" },
  { name: "ficha de preventa real", path: "/colecciones/singani-preventa-2026", ready: "El lote, paso a paso" },
  { name: "bodegas", path: "/bodegas", ready: CASE.winery },
  { name: "bodega", path: `/bodegas/${CASE.winerySlug}`, ready: "Colecciones de esta bodega" },
  { name: "no encontrado", path: "/no-existe", ready: "Página no encontrada" },
];

for (const { name, path, ready } of PAGES) {
  test(`axe sin violaciones serias: ${name}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: ready }).first()).toBeVisible();
    // La comprobación de la botella termina antes de auditar (estado final de la página).
    if (path === `/b/${CASE.bottle.code}`) {
      await expect(page.getByText("Este código pertenece al expediente cerrado")).toBeVisible();
    }
    expect(await axe(page)).toEqual([]);
  });
}

test("axe con el error del formulario a la vista", async ({ page }) => {
  await page.goto("/");
  await codeField(page).fill("K7M2");
  await codeField(page).press("Enter");
  await expect(fieldError(page)).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

test("recorrido solo con teclado: salto al contenido, código e Intro", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // El primer Tab muestra el salto al contenido, con foco visible.
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Saltar al contenido" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  expect(await hasVisibleFocus(page)).toBe(true);

  // Intro salta al contenido; el siguiente Tab cae en el campo del código.
  await page.keyboard.press("Enter");
  await expect(page.locator("#contenido")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(codeField(page)).toBeFocused();
  expect(await hasVisibleFocus(page)).toBe(true);

  // Un código mal escrito deja el foco en el campo, con el error anunciado.
  await page.keyboard.type("664t");
  await page.keyboard.press("Enter");
  await expect(fieldError(page)).toBeVisible();
  await expect(codeField(page)).toBeFocused();

  // Se corrige y se envía con Intro: abre el pasaporte.
  await page.keyboard.type(CASE.bottle.formatted.slice(4).toLowerCase());
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/b/${CASE.bottle.code}$`));
  await expect(page.getByRole("heading", { level: 1, name: CASE.name })).toBeVisible();
  expect(errors).toEqual([]);
});

/** Recorre la página con Tab y devuelve lo alcanzado, comprobando el foco visible en cada parada. */
async function tabThrough(page: import("@playwright/test").Page, max = 60) {
  const reached: string[] = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const label = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      return (el.getAttribute("aria-label") ?? el.textContent ?? "").trim() || el.getAttribute("name");
    });
    // Fin del recorrido: el foco sale de la página o vuelve a empezar.
    if (label === null || (i > 0 && label === "Saltar al contenido")) break;
    reached.push(label);
    expect(await hasVisibleFocus(page), `foco visible en "${label}"`).toBe(true);
  }
  return reached;
}

test("todo lo interactivo de la portada se alcanza con Tab y muestra el foco", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Destacados" }).getByRole("article")).not.toHaveCount(0);

  const reached = await tabThrough(page);
  for (const expected of [
    "Saltar al contenido",
    "Drinks on Chain",
    "code",
    "Verificar",
    "Ver todo el catálogo",
    CASE.name,
    "Ver las bodegas",
    // La navegación del shell (pestañas en móvil, cabecera en escritorio).
    "Catálogo",
    "Bodegas",
  ]) {
    expect(reached, `se alcanza "${expected}"`).toContain(expected);
  }
});

test("los filtros del catálogo se manejan con teclado", async ({ page }) => {
  await page.goto("/catalogo");
  const status = page.getByRole("status").filter({ hasText: /colecci(ón|ones)$/ });
  await expect(status).toHaveText(CATALOG.total);

  // Un filtro se activa con la barra espaciadora y con Intro.
  const singani = page.getByRole("group", { name: "Tipo" }).getByRole("button", { name: "Singani" });
  await singani.focus();
  expect(await hasVisibleFocus(page)).toBe(true);
  await page.keyboard.press("Space");
  await expect(page).toHaveURL(/\?tipo=singani$/);
  await expect(status).toHaveText(CATALOG.where((c) => c.productType === "SINGANI"));
  await expect(singani).toHaveAttribute("aria-pressed", "true");

  // El selector de bodega es el del sistema: recibe el foco y se cambia sin ratón.
  const winery = page.getByRole("combobox", { name: "Bodega" });
  await winery.focus();
  expect(await hasVisibleFocus(page)).toBe(true);
  await winery.selectOption({ label: "Destilería Cinti Viejo" });
  await expect(page).toHaveURL(/tipo=singani&bodega=destileria-cinti-viejo$/);
  await expect(status).toHaveText(
    CATALOG.where((c) => c.productType === "SINGANI" && c.winery.slug === CASE.winerySlug),
  );

  // La búsqueda se envía con Intro.
  await page.getByRole("searchbox", { name: "Buscar" }).focus();
  await page.keyboard.type("molino");
  await page.keyboard.press("Enter");
  await expect(status).toHaveText(
    CATALOG.where((c) => c.productType === "SINGANI" && c.winery.slug === CASE.winerySlug && /molino/i.test(c.name)),
  );
});
