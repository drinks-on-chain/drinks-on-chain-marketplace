import { expect, test } from "@playwright/test";
import { BOTTLE, axe, codeField, fieldError, hasVisibleFocus, trackErrors } from "./support";

// 2F · Teclado completo, foco visible y auditoría axe sin violaciones serias, a 390 y a 1280 px.

const PAGES: { name: string; path: string; ready: string }[] = [
  { name: "portada", path: "/", ready: "El origen de cada botella, a la vista" },
  { name: "verificar", path: "/b", ready: "Verifica una botella" },
  { name: "visor (no encontrado)", path: `/b/${BOTTLE.code}`, ready: "No encontramos este código" },
  { name: "visor (mal escrito)", path: "/b/K7MZ-Q9XM", ready: "Este código está mal escrito" },
  { name: "catálogo", path: "/catalogo", ready: "El catálogo llega muy pronto" },
  { name: "no encontrado", path: "/no-existe", ready: "Página no encontrada" },
];

for (const { name, path, ready } of PAGES) {
  test(`axe sin violaciones serias: ${name}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: ready }).first()).toBeVisible();
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
  await page.keyboard.type("k7m2");
  await page.keyboard.press("Enter");
  await expect(fieldError(page)).toBeVisible();
  await expect(codeField(page)).toBeFocused();

  // Se corrige y se envía con Intro.
  await page.keyboard.type("-q9xm");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/b/${BOTTLE.code}$`));
  await expect(page.getByRole("heading", { level: 1, name: BOTTLE.formatted })).toBeVisible();
  expect(errors).toEqual([]);
});

test("todo lo interactivo de la portada se alcanza con Tab y muestra el foco", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const reached: string[] = [];
  for (let i = 0; i < 20; i++) {
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

  for (const expected of ["Saltar al contenido", "Drinks on Chain", "code", "Verificar", "Ver el catálogo"]) {
    expect(reached, `se alcanza "${expected}"`).toContain(expected);
  }
  // La navegación del shell (pestañas en móvil, cabecera en escritorio) también.
  expect(reached).toContain("Catálogo");
});
