import type { CollectionFilters, CollectionSort, CollectionStatus } from "./api";

// Filtros del catálogo ↔ parámetros de la URL (en español, para que el enlace se pueda compartir).
// [BORRADOR §17.1] Los filtros y el orden son los del borrador del catálogo y pueden cambiar con él.

export const CATALOG_PARAMS = {
  productType: "tipo",
  status: "estado",
  winery: "bodega",
  q: "q",
  sort: "orden",
  page: "pagina",
} as const;

/** Colecciones por página (el backend admite `limit` ≤ 100). */
export const CATALOG_PAGE_SIZE = 12;

const PRODUCT_TYPE_SLUGS = { vino: "WINE", singani: "SINGANI" } as const;
const STATUS_SLUGS: Record<string, CollectionStatus> = {
  preventa: "PRESALE",
  "a-la-venta": "ON_SALE",
  agotado: "SOLD_OUT",
};
/** El orden por defecto (`featured`: destacadas primero) no se escribe en la URL. */
const SORT_SLUGS: Record<string, Exclude<CollectionSort, "featured">> = {
  recientes: "newest",
  "precio-menor": "price-asc",
  "precio-mayor": "price-desc",
  nombre: "name",
};

type Reader = { get(name: string): string | null };

const slugOf = <T extends string>(map: Record<string, T>, value: T | undefined) =>
  value ? (Object.keys(map).find((slug) => map[slug] === value) ?? null) : null;

/** Lee los filtros de la URL; lo que no se reconoce se ignora. */
export function filtersFromParams(params: Reader): CollectionFilters {
  const winery = params.get(CATALOG_PARAMS.winery)?.trim();
  const q = params.get(CATALOG_PARAMS.q)?.trim();
  const productType = (PRODUCT_TYPE_SLUGS as Record<string, "WINE" | "SINGANI">)[
    params.get(CATALOG_PARAMS.productType) ?? ""
  ];
  const status = STATUS_SLUGS[params.get(CATALOG_PARAMS.status) ?? ""];
  const sort = SORT_SLUGS[params.get(CATALOG_PARAMS.sort) ?? ""];
  return {
    ...(productType ? { productType } : {}),
    ...(status ? { status } : {}),
    ...(winery ? { winery } : {}),
    ...(q ? { q } : {}),
    ...(sort ? { sort } : {}),
  };
}

/** Valor de cada parámetro de la URL para unos filtros (`null` = quitar el parámetro). */
export function paramsFromFilters(filters: CollectionFilters): Record<string, string | null> {
  return {
    [CATALOG_PARAMS.productType]: slugOf(PRODUCT_TYPE_SLUGS, filters.productType),
    [CATALOG_PARAMS.status]: slugOf(STATUS_SLUGS, filters.status),
    [CATALOG_PARAMS.winery]: filters.winery || null,
    [CATALOG_PARAMS.q]: filters.q || null,
    [CATALOG_PARAMS.sort]: filters.sort && filters.sort !== "featured" ? slugOf(SORT_SLUGS, filters.sort) : null,
  };
}

/** Página (1, 2, 3…) de la URL y su `offset`. */
export function pageFromParams(params: Reader, limit = CATALOG_PAGE_SIZE) {
  const n = Number(params.get(CATALOG_PARAMS.page));
  const page = Number.isInteger(n) && n > 1 ? n : 1;
  return { page, offset: (page - 1) * limit };
}

/** ¿Hay algún filtro puesto? (El orden no es un filtro: no cambia qué colecciones salen.) */
export const hasFilters = ({ productType, status, winery, q }: CollectionFilters) =>
  Boolean(productType || status || winery || q);

/** Ruta del catálogo con unos filtros (enlaces "Ver singanis", "De esta bodega"…). */
export function catalogHref(base: string, filters: CollectionFilters = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(paramsFromFilters(filters))) if (value) query.set(key, value);
  const qs = query.toString();
  return qs ? `${base}?${qs}` : base;
}
