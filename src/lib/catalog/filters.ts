import { COLLECTION_STATUSES, LOT_PRODUCT_TYPES } from "@drinks-on-chain/mocks";
import type { CollectionFilters } from "./api";

// Filtros del catálogo ↔ parámetros de la URL (en español, para que el enlace se pueda compartir).
// [BORRADOR §17.1] Los filtros son los del borrador del catálogo y pueden cambiar con él.

export const CATALOG_PARAMS = {
  productType: "tipo",
  status: "estado",
  winery: "bodega",
  q: "q",
  page: "pagina",
} as const;

/** Colecciones por página (el backend admite `limit` ≤ 100). */
export const CATALOG_PAGE_SIZE = 12;

const PRODUCT_TYPE_SLUGS = { vino: "WINE", singani: "SINGANI" } as const;
const STATUS_SLUGS = { preventa: "PRESALE", "a-la-venta": "ON_SALE", agotado: "SOLD_OUT" } as const;

type Reader = { get(name: string): string | null };

const slugOf = <T extends string>(map: Record<string, T>, value: T | undefined) =>
  value ? (Object.keys(map).find((slug) => map[slug] === value) ?? null) : null;

/** Lee los filtros de la URL; lo que no se reconoce se ignora. */
export function filtersFromParams(params: Reader): CollectionFilters {
  const type = params.get(CATALOG_PARAMS.productType) ?? "";
  const status = params.get(CATALOG_PARAMS.status) ?? "";
  const winery = params.get(CATALOG_PARAMS.winery)?.trim();
  const q = params.get(CATALOG_PARAMS.q)?.trim();
  const productType = (PRODUCT_TYPE_SLUGS as Record<string, (typeof LOT_PRODUCT_TYPES)[number]>)[type];
  const statusValue = (STATUS_SLUGS as Record<string, (typeof COLLECTION_STATUSES)[number]>)[status];
  return {
    ...(productType ? { productType } : {}),
    ...(statusValue ? { status: statusValue } : {}),
    ...(winery ? { winery } : {}),
    ...(q ? { q } : {}),
  };
}

/** Valor de cada parámetro de la URL para unos filtros (`null` = quitar el parámetro). */
export function paramsFromFilters(filters: CollectionFilters): Record<string, string | null> {
  return {
    [CATALOG_PARAMS.productType]: slugOf(PRODUCT_TYPE_SLUGS, filters.productType),
    [CATALOG_PARAMS.status]: slugOf(STATUS_SLUGS, filters.status),
    [CATALOG_PARAMS.winery]: filters.winery || null,
    [CATALOG_PARAMS.q]: filters.q || null,
  };
}

/** Página (1, 2, 3…) de la URL y su `offset`. */
export function pageFromParams(params: Reader, limit = CATALOG_PAGE_SIZE) {
  const n = Number(params.get(CATALOG_PARAMS.page));
  const page = Number.isInteger(n) && n > 1 ? n : 1;
  return { page, offset: (page - 1) * limit };
}

export const hasFilters = (filters: CollectionFilters) => Object.keys(filters).length > 0;

/** Ruta del catálogo con unos filtros (enlaces "Ver singanis", "De esta bodega"…). */
export function catalogHref(base: string, filters: CollectionFilters = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(paramsFromFilters(filters))) if (value) query.set(key, value);
  const qs = query.toString();
  return qs ? `${base}?${qs}` : base;
}
