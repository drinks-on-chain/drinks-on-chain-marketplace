import { expect, test, type Page } from "@playwright/test";
import { CASE, CATALOG, NO_PRICE_COLLECTION, expectNoHorizontalScroll, shellNav, trackErrors } from "./support";

// 2A · Catálogo sin cuenta y páginas de bodega, contra los mocks.
// [BORRADOR §17.1] `/v1/public/collections` es un borrador: estas pruebas cambian con él.

const cards = (page: Page) => page.getByRole("main").getByRole("article");
const count = (page: Page) => page.getByRole("status").filter({ hasText: /colecci(ón|ones)$/ });
const pill = (page: Page, group: string, name: string) =>
  page.getByRole("group", { name: group }).getByRole("button", { name, exact: true });

test("catálogo: lista, filtros en la URL y búsqueda", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await shellNav(page).getByRole("link", { name: "Catálogo" }).click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.getByRole("heading", { level: 1, name: "Catálogo" })).toBeVisible();
  await expect(count(page)).toHaveText(CATALOG.total);
  await expect(cards(page)).toHaveCount(CATALOG.size);
  // Las destacadas van primero (orden por defecto del catálogo) y las imágenes cargan.
  await expect(cards(page).first().getByRole("link")).toHaveText(CATALOG.featured[0]!.name);
  await expect
    .poll(() =>
      cards(page)
        .first()
        .locator("img")
        .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expectNoHorizontalScroll(page);

  // Tipo.
  await pill(page, "Tipo", "Vino").click();
  await expect(page).toHaveURL(/\?tipo=vino$/);
  await expect(count(page)).toHaveText(CATALOG.where((c) => c.productType === "WINE"));
  await expect(pill(page, "Tipo", "Vino")).toHaveAttribute("aria-pressed", "true");
  for (const card of await cards(page).all()) await expect(card).toContainText("Vino ·");

  // Estado, sumado al tipo.
  await pill(page, "Estado", "Agotado").click();
  await expect(page).toHaveURL(/tipo=vino&estado=agotado$/);
  await expect(count(page)).toHaveText("1 colección");
  await expect(cards(page).first()).toContainText("Agotado");

  // Los filtros sobreviven a la recarga (viven en la URL).
  await page.reload();
  await expect(count(page)).toHaveText("1 colección");
  await expect(pill(page, "Estado", "Agotado")).toHaveAttribute("aria-pressed", "true");

  // Quitar filtros.
  await page.getByRole("button", { name: "Quitar filtros" }).click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(count(page)).toHaveText(CATALOG.total);

  // Búsqueda por nombre.
  await page.getByRole("searchbox", { name: "Buscar" }).fill("gran reserva");
  await page.getByRole("searchbox", { name: "Buscar" }).press("Enter");
  await expect(page).toHaveURL(/\?q=gran\+reserva$/);
  await expect(count(page)).toHaveText("1 colección");
  await expect(cards(page).first().getByRole("link", { name: CASE.name })).toBeVisible();

  // Nada coincide: estado vacío con salida.
  await page.getByRole("searchbox", { name: "Buscar" }).fill("no existe tal vino");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ninguna colección coincide" })).toBeVisible();
  await page.getByRole("main").getByRole("button", { name: "Quitar filtros" }).last().click();
  await expect(count(page)).toHaveText(CATALOG.total);
  expect(errors).toEqual([]);
});

test("catálogo: filtro por bodega y orden, en la URL", async ({ page }) => {
  await page.goto("/catalogo");
  await expect(count(page)).toHaveText(CATALOG.total);
  await page.getByRole("combobox", { name: "Bodega" }).selectOption({ label: "Bodega Altos de Calamuchita" });
  await expect(page).toHaveURL(/\?bodega=altos-de-calamuchita$/);
  await expect(count(page)).toHaveText(CATALOG.where((c) => c.winery.slug === "altos-de-calamuchita"));
  await expect(cards(page).first()).toContainText("Bodega Altos de Calamuchita");
  await page.getByRole("button", { name: "Quitar filtros" }).click();

  // El orden lo aplica el catálogo (`?sort=`); el de por defecto no se escribe en la URL.
  await page.getByRole("combobox", { name: "Ordenar por" }).selectOption({ label: "Precio: de menor a mayor" });
  await expect(page).toHaveURL(/\?orden=precio-menor$/);
  await expect(cards(page).first().getByRole("link")).toHaveText(CATALOG.cheapest.name);
  // Ordenar no es filtrar: siguen todas y no aparece "Quitar filtros".
  await expect(count(page)).toHaveText(CATALOG.total);
  await expect(page.getByRole("button", { name: "Quitar filtros" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Ordenar por" })).toHaveValue("price-asc");
  await expect(cards(page).first().getByRole("link")).toHaveText(CATALOG.cheapest.name);
});

test("ficha de colección: precio, disponibilidad, lote y «Avísame» (sin compra)", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/catalogo");
  await cards(page).getByRole("link", { name: CASE.name }).click();
  await expect(page).toHaveURL(new RegExp(`/colecciones/${CASE.collectionSlug}$`));

  await expect(page.getByRole("heading", { level: 1, name: CASE.name })).toBeVisible();
  await expect(page.getByText("Singani · Añada 2026")).toBeVisible();
  await expect(page.getByText(/^Bs\s280$/)).toBeVisible();
  await expect(page.getByText("A la venta", { exact: true })).toBeVisible();
  await expect(page.getByText(/^Quedan [\d.]+ de 60 botellas$/)).toBeVisible();
  await expect(page.getByText("Edición numerada: «Botella N de 60»")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Notas de cata" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Maridaje" })).toBeVisible();

  // Sin compra ni cuenta: la acción lleva a la lista de espera de la landing.
  await expect(page.getByRole("link", { name: "Avísame" })).toHaveAttribute(
    "href",
    "https://landing.ejemplo.test/lista-de-espera?src=marketplace",
  );
  await expect(page.getByRole("button", { name: /comprar|adquirir|pagar/i })).toHaveCount(0);

  // Línea de tiempo del lote y paso a su pasaporte.
  const journey = page.getByRole("region", { name: "El lote, paso a paso" });
  await expect(journey.getByRole("listitem").first()).toContainText("Uva recibida y pesada en la bodega");
  await expectNoHorizontalScroll(page);
  await journey.getByRole("link", { name: "Ver el pasaporte del lote" }).click();
  await expect(page).toHaveURL(new RegExp(`/b/${CASE.lotCode}$`));
  await expect(page.getByText("Esta etiqueta identifica el lote")).toBeVisible();
  expect(errors).toEqual([]);
});

test("ficha en preventa sin precio: «Precio por anunciar»", async ({ page }) => {
  await page.goto(`/colecciones/${NO_PRICE_COLLECTION.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: NO_PRICE_COLLECTION.name })).toBeVisible();
  await expect(page.getByText("Precio por anunciar")).toBeVisible();
  await expect(page.getByText("Preventa", { exact: true })).toBeVisible();
  await expect(page.getByText(/^Lista hacia el /)).toBeVisible();
  await expect(page.getByText("El pasaporte del lote se publica cuando se embotella.")).toBeVisible();
  await expect(page.getByText(/^Bs\s\d/)).toHaveCount(0);
});

test("preventa real: sin precio, 100 botellas disponibles y su portada servida por la API", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/colecciones/singani-preventa-2026");
  await expect(page.getByRole("heading", { level: 1, name: "Singani Preventa 2026" })).toBeVisible();
  await expect(page.getByText("Precio por anunciar")).toBeVisible();
  await expect(page.getByText("Preventa", { exact: true })).toBeVisible();
  await expect(page.getByText("Quedan 100 de 100 botellas")).toBeVisible();
  await expect(page.getByText("Edición numerada: «Botella N de 100»")).toBeVisible();
  await expect(page.getByText(/^Bs\s\d/)).toHaveCount(0);
  // La portada llega por `/api/v1/public/collections/images/{id}` (el proxy del propio origen).
  const cover = page.getByRole("main").locator("img").first();
  await expect(cover).toHaveAttribute("src", /^\/api\/v1\/public\/collections\/images\//);
  await expect
    .poll(() => cover.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
    .toBeGreaterThan(0);
  // Los hechos de la tokenización salen en el recorrido del lote.
  await expect(page.getByRole("region", { name: "El lote, paso a paso" })).toContainText("Colección publicada");
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("la dirección antigua de la ficha (/catalogo/{slug}) redirige a /colecciones/{slug}", async ({
  page,
  request,
}) => {
  const response = await request.get(`/catalogo/${CASE.collectionSlug}`, { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe(`/colecciones/${CASE.collectionSlug}`);
  await page.goto(`/catalogo/${CASE.collectionSlug}`);
  await expect(page).toHaveURL(new RegExp(`/colecciones/${CASE.collectionSlug}$`));
  await expect(page.getByRole("heading", { level: 1, name: CASE.name })).toBeVisible();
});

test("una colección que no existe: aviso y vuelta al catálogo", async ({ page }) => {
  await page.goto("/colecciones/no-existe");
  await expect(page.getByRole("heading", { name: "No encontramos esta colección" })).toBeVisible();
  await page.getByRole("link", { name: "Volver al catálogo" }).click();
  await expect(page).toHaveURL(/\/catalogo$/);
});

test("bodegas: directorio, página de bodega y sus colecciones", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await shellNav(page).getByRole("link", { name: "Bodegas" }).click();
  await expect(page).toHaveURL(/\/bodegas$/);
  await expect(page.getByRole("heading", { level: 1, name: "Bodegas" })).toBeVisible();
  await expect(cards(page)).toHaveCount(2);
  await expectNoHorizontalScroll(page);

  await page.getByRole("link", { name: CASE.winery }).click();
  await expect(page).toHaveURL(new RegExp(`/bodegas/${CASE.winerySlug}$`));
  await expect(page.getByRole("heading", { level: 1, name: CASE.winery })).toBeVisible();
  await expect(page.getByText("Destilería", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Historia" })).toContainText("cañón de Cinti");
  // El logotipo de los datos de demostración lo sirven los mocks.
  await expect
    .poll(() =>
      page
        .getByRole("main")
        .locator("img")
        .first()
        .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(page.getByRole("link", { name: `Sitio web de ${CASE.winery}` })).toHaveAttribute(
    "href",
    "https://cintiviejo.test",
  );

  const collections = page.getByRole("region", { name: "Colecciones de esta bodega" });
  await expect(collections.getByRole("article")).toHaveCount(CATALOG.ofWinery(CASE.winerySlug).length);
  await expect(collections.getByRole("link", { name: CASE.name })).toBeVisible();
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("una bodega que no existe: aviso y vuelta al directorio", async ({ page }) => {
  await page.goto("/bodegas/no-existe");
  await expect(page.getByRole("heading", { name: "No encontramos esta bodega" })).toBeVisible();
  await page.getByRole("link", { name: "Ver todas las bodegas" }).click();
  await expect(page).toHaveURL(/\/bodegas$/);
});
