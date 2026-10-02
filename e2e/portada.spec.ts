import { expect, test } from "@playwright/test";
import { codeField, expectNoHorizontalScroll, isMobile, trackErrors, verifyButton } from "./support";

// Portada provisional, shell y PWA básica (O2-MK-1, fase 1). Cada prueba corre a 390 y a 1280 px.

test("portada: marca, verificar una botella y catálogo próximamente", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "El origen de cada botella, a la vista" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Drinks on Chain", exact: true })).toBeVisible();

  await expect(page.getByRole("heading", { level: 2, name: "Verifica una botella" })).toBeVisible();
  await expect(codeField(page)).toBeVisible();
  await expect(verifyButton(page)).toBeVisible();

  await expect(page.getByRole("heading", { level: 2, name: "Catálogo" })).toBeVisible();
  await expect(page.getByText("Próximamente", { exact: true })).toBeVisible();

  // Sitio público: nadie entra ni se le manda a un login.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: /Entrar/ })).toHaveCount(0);

  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("StoreShell: pestañas inferiores en móvil, cabecera en escritorio", async ({ page }) => {
  await page.goto("/");
  const tabs = page.getByRole("navigation", { name: "Secciones" });
  const header = page.getByRole("navigation", { name: "Principal" });

  if (isMobile(page)) {
    await expect(tabs).toBeVisible();
    await expect(header).toBeHidden();
    await expect(tabs.getByRole("link", { name: "Inicio" })).toHaveAttribute("aria-current", "page");
    // Objetivos táctiles de al menos 44 px.
    for (const link of await tabs.getByRole("link").all()) {
      const box = await link.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    await tabs.getByRole("link", { name: "Verificar" }).click();
  } else {
    await expect(header).toBeVisible();
    await expect(tabs).toBeHidden();
    await header.getByRole("link", { name: "Verificar" }).click();
  }

  await expect(page).toHaveURL(/\/b$/);
  await expect(page.getByRole("heading", { level: 1, name: "Verifica una botella" })).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("catálogo: próximamente, con salida hacia verificar", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Ver el catálogo" }).click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.getByRole("heading", { level: 1, name: "Catálogo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "El catálogo llega muy pronto" })).toBeVisible();

  await page.getByRole("link", { name: "Verifica una botella" }).click();
  await expect(page).toHaveURL(/\/b$/);
  expect(errors).toEqual([]);
});

test("el pie enlaza con los otros sitios solo por NEXT_PUBLIC_URL_*", async ({ page }) => {
  await page.goto("/");
  const footer = page.locator("footer");
  await expect(footer.getByRole("link", { name: "Conoce Drinks on Chain" })).toHaveAttribute(
    "href",
    "https://landing.ejemplo.test/",
  );
  await expect(footer.getByRole("link", { name: "Bodegas de la red" })).toHaveAttribute(
    "href",
    "https://bodegas.ejemplo.test/",
  );
});

test("una dirección que no existe muestra la página de no encontrado", async ({ page }) => {
  const response = await page.goto("/no-existe");
  expect(response!.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeAttached();
  await page.getByRole("link", { name: "Volver al inicio" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("PWA básica: manifest, iconos y theme-color", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#fdfcf5");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBeTruthy();

  const response = await request.get(href!);
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as {
    name: string;
    display: string;
    start_url: string;
    theme_color: string;
    background_color: string;
    icons: { src: string; sizes: string; type: string; purpose?: string }[];
  };
  expect(manifest).toMatchObject({
    name: "Drinks on Chain",
    display: "standalone",
    start_url: "/",
    theme_color: "#fdfcf5",
    background_color: "#fdfcf5",
  });
  // Instalable: iconos PNG de 192 y 512 px, y uno adaptable ("maskable").
  expect(manifest.icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  expect(manifest.icons.some((i) => i.purpose === "maskable")).toBe(true);
  for (const icon of manifest.icons) {
    const image = await request.get(icon.src);
    expect(image.ok(), icon.src).toBe(true);
    expect(image.headers()["content-type"]).toBe("image/png");
  }

  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
});
