import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { publicFixtures } from "@drinks-on-chain/mocks/fixtures";
import type { Collection } from "@/lib/catalog/api";
import { catalogHref, filtersFromParams, hasFilters, pageFromParams, paramsFromFilters } from "@/lib/catalog/filters";
import { fmtBob, fmtDecimal } from "@/lib/format";
import { usableImageUrl } from "@/lib/images";
import { BottleCard } from "../store/bottle-card";
import { PriceTag } from "../store/price-tag";
import { CollectionDetail } from "./collection-screen";

// [BORRADOR §17.1] Pruebas de las piezas del catálogo contra los fixtures del borrador.

vi.mock("@/lib/links", async (original) => {
  const actual = await original<typeof import("@/lib/links")>();
  return { ...actual, links: actual.buildLinks({ landing: "https://landing.ejemplo.bo", bodegas: "", app: "" }) };
});

const collection = (slug: string): Collection =>
  structuredClone(publicFixtures.collections.find((c) => c.slug === slug)!);
/** Los espacios duros de `Intl` (U+00A0, U+202F) como espacios normales. */
const nbsp = (text: string) => text.replace(/[\u00a0\u202f]/g, " ");

describe("precio", () => {
  afterEach(cleanup);

  it("fmtBob: bolivianos desde céntimos, sin decimales si el importe es entero", () => {
    expect(nbsp(fmtBob(18500))).toBe("Bs 185");
    expect(nbsp(fmtBob(18550))).toBe("Bs 185,50");
    expect(nbsp(fmtBob(1250000))).toBe("Bs 12.500");
    expect(fmtDecimal(40)).toBe("40");
    expect(fmtDecimal(46.5)).toBe("46,5");
    expect(fmtDecimal(0.213)).toBe("0,21");
  });

  it("PriceTag: el precio puede faltar y entonces se dice, sin inventar una cifra", () => {
    render(<PriceTag price={null} />);
    expect(screen.getByText("Precio por anunciar")).toBeInTheDocument();
    cleanup();
    const { container } = render(<PriceTag price={{ amountMinor: 18500, currency: "BOB" }} />);
    expect(nbsp(container.textContent ?? "")).toBe("Bs 185");
  });
});

describe("BottleCard", () => {
  afterEach(cleanup);

  it("enlaza a la ficha con nombre, tipo, añada, bodega, precio y estado", () => {
    render(<BottleCard collection={collection("singani-gran-reserva-2026")} />);
    const card = screen.getByRole("article");
    expect(within(card).getByRole("link", { name: "Singani Gran Reserva 2026" })).toHaveAttribute(
      "href",
      "/colecciones/singani-gran-reserva-2026",
    );
    expect(card).toHaveTextContent("Singani · 2026");
    expect(card).toHaveTextContent("Destilería Cinti Viejo");
    expect(card).toHaveTextContent("A la venta");
    expect(card).toHaveTextContent("60 disponibles");
    expect(nbsp(card.textContent ?? "")).toContain("Bs 280");
    // La portada de una colección real la sirve la API: se pide por el proxy del propio origen.
    expect(card.querySelector("img")?.getAttribute("src")).toMatch(/^\/api\/v1\/public\/collections\/images\//);
  });

  it("sin MSW las imágenes de demostración no existen: se pinta la ilustración", () => {
    render(<BottleCard collection={collection("singani-el-molino-2025")} />);
    const card = screen.getByRole("article");
    expect(card.querySelector("img")).toBeNull();
    expect(card.querySelector("svg")).not.toBeNull();
  });

  it("sin precio: «Precio por anunciar»", () => {
    render(<BottleCard collection={collection("singani-edicion-aniversario-2026")} />);
    expect(screen.getByRole("article")).toHaveTextContent("Precio por anunciar");
    expect(screen.getByRole("article")).toHaveTextContent("Preventa");
  });

  it("agotada: no anuncia botellas disponibles", () => {
    render(<BottleCard collection={collection("vino-las-carreras-2025")} />);
    expect(screen.getByRole("article")).toHaveTextContent("Agotado");
    expect(screen.getByRole("article")).not.toHaveTextContent("disponibles");
  });
});

describe("CollectionDetail", () => {
  afterEach(cleanup);

  it("a la venta: precio, disponibilidad, lote con su línea de tiempo y enlace al pasaporte", () => {
    render(<CollectionDetail collection={collection("singani-gran-reserva-2026")} />);
    expect(screen.getByRole("heading", { level: 1, name: "Singani Gran Reserva 2026" })).toBeInTheDocument();
    expect(screen.getByText("Quedan 60 de 60 botellas")).toBeInTheDocument();
    expect(screen.getByText("Edición numerada: «Botella N de 60»")).toBeInTheDocument();
    expect(screen.getByText("A la venta")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Destilería Cinti Viejo" })).toHaveAttribute(
      "href",
      "/bodegas/destileria-cinti-viejo",
    );
    const journey = screen.getByRole("region", { name: "El lote, paso a paso" });
    expect(within(journey).getAllByRole("listitem").length).toBeGreaterThan(3);
    expect(within(journey).getByRole("link", { name: "Ver el pasaporte del lote" })).toHaveAttribute(
      "href",
      "/b/CVJ-2026-SINGANI-004",
    );
  });

  it("no hay compra: la acción es «Avísame», hacia la lista de espera de la landing", () => {
    render(<CollectionDetail collection={collection("singani-gran-reserva-2026")} />);
    expect(screen.getByRole("link", { name: "Avísame" })).toHaveAttribute(
      "href",
      "https://landing.ejemplo.bo/lista-de-espera?src=marketplace",
    );
    expect(screen.queryByRole("button", { name: /comprar|adquirir|pagar/i })).toBeNull();
  });

  it("preventa sin precio: «Precio por anunciar», fecha estimada y pasaporte pendiente", () => {
    render(<CollectionDetail collection={collection("singani-edicion-aniversario-2026")} />);
    expect(screen.getByText("Precio por anunciar")).toBeInTheDocument();
    expect(screen.queryByText("por botella")).toBeNull();
    expect(screen.getByText("Preventa")).toBeInTheDocument();
    expect(screen.getByText(/Lista hacia el 30 jun 2027/)).toBeInTheDocument();
    expect(screen.getByText("Estado del lote: En el viñedo")).toBeInTheDocument();
    expect(screen.getByText("El pasaporte del lote se publica cuando se embotella.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ver el pasaporte del lote" })).toBeNull();
  });

  it("manda `saleState` y `counts.available` (contrato §13.1) sobre los nombres del borrador anterior", () => {
    const c = collection("singani-gran-reserva-2026");
    c.status = "PRESALE";
    c.availability.available = 1;
    c.saleState = "ON_SALE";
    c.counts.available = 12;
    render(<CollectionDetail collection={c} />);
    expect(screen.getByText("A la venta")).toBeInTheDocument();
    expect(screen.getByText("Quedan 12 de 60 botellas")).toBeInTheDocument();
  });

  it("preventa real sin precio: «Precio por anunciar», 100 disponibles y sin pasaporte todavía", () => {
    render(<CollectionDetail collection={collection("singani-preventa-2026")} />);
    expect(screen.getByRole("heading", { level: 1, name: "Singani Preventa 2026" })).toBeInTheDocument();
    expect(screen.getByText("Precio por anunciar")).toBeInTheDocument();
    expect(screen.getByText("Preventa")).toBeInTheDocument();
    expect(screen.getByText("Quedan 100 de 100 botellas")).toBeInTheDocument();
    expect(screen.getByText("Edición numerada: «Botella N de 100»")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ver el pasaporte del lote" })).toBeNull();
  });

  it("agotado: sin botellas disponibles", () => {
    render(<CollectionDetail collection={collection("vino-las-carreras-2025")} />);
    expect(screen.getByText("Agotado")).toBeInTheDocument();
    expect(screen.getByText("Sin botellas disponibles")).toBeInTheDocument();
  });
});

describe("filtros del catálogo en la URL", () => {
  it("lee los filtros en español y descarta lo que no reconoce", () => {
    const params = new URLSearchParams("tipo=singani&estado=a-la-venta&bodega=destileria-cinti-viejo&q=%20gran%20");
    expect(filtersFromParams(params)).toEqual({
      productType: "SINGANI",
      status: "ON_SALE",
      winery: "destileria-cinti-viejo",
      q: "gran",
    });
    expect(filtersFromParams(new URLSearchParams("tipo=ron&estado=x&q="))).toEqual({});
  });

  it("escribe los filtros de vuelta y quita los vacíos", () => {
    expect(paramsFromFilters({ productType: "WINE", status: "PRESALE" })).toEqual({
      tipo: "vino",
      estado: "preventa",
      bodega: null,
      q: null,
      orden: null,
    });
    // El orden por defecto no se escribe; los demás, en español.
    expect(paramsFromFilters({ sort: "featured" }).orden).toBeNull();
    expect(paramsFromFilters({ sort: "price-asc" }).orden).toBe("precio-menor");
    expect(filtersFromParams(new URLSearchParams("orden=recientes"))).toEqual({ sort: "newest" });
    expect(filtersFromParams(new URLSearchParams("orden=raro"))).toEqual({});
    // Ordenar no cuenta como filtro ("Quitar filtros" no aparece solo por eso).
    expect(hasFilters({ sort: "name" })).toBe(false);
    expect(hasFilters({})).toBe(false);
    expect(hasFilters({ q: "gran" })).toBe(true);
    expect(catalogHref("/catalogo")).toBe("/catalogo");
    expect(catalogHref("/catalogo", { status: "SOLD_OUT", winery: "altos-de-calamuchita" })).toBe(
      "/catalogo?estado=agotado&bodega=altos-de-calamuchita",
    );
  });

  it("la página sale de ?pagina=", () => {
    expect(pageFromParams(new URLSearchParams(""))).toEqual({ page: 1, offset: 0 });
    expect(pageFromParams(new URLSearchParams("pagina=3"), 12)).toEqual({ page: 3, offset: 24 });
    expect(pageFromParams(new URLSearchParams("pagina=-2"))).toEqual({ page: 1, offset: 0 });
    expect(pageFromParams(new URLSearchParams("pagina=abc"))).toEqual({ page: 1, offset: 0 });
  });
});

describe("usableImageUrl", () => {
  it("descarta las rutas de demostración y lo que no es http(s) ni del propio origen", () => {
    // Las rutas de demostración solo existen con MSW activo (los handlers las sirven).
    expect(usableImageUrl("/mocks/uploads/collections/x.jpg", false)).toBeNull();
    expect(usableImageUrl("/mocks/uploads/collections/x.jpg", true)).toBe("/mocks/uploads/collections/x.jpg");
    expect(usableImageUrl(null)).toBeNull();
    expect(usableImageUrl("")).toBeNull();
    expect(usableImageUrl("javascript:alert(1)")).toBeNull();
    expect(usableImageUrl("//otro.ejemplo/x.png")).toBeNull();
    expect(usableImageUrl("https://cdn.ejemplo.bo/x.jpg")).toBe("https://cdn.ejemplo.bo/x.jpg");
    expect(usableImageUrl("/uploads/x.jpg")).toBe("/uploads/x.jpg");
    // Las imágenes que sirve la API van por el proxy del propio origen.
    expect(usableImageUrl("/v1/public/collections/images/abc")).toBe("/api/v1/public/collections/images/abc");
  });
});
