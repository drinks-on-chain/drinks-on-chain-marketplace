import {
  PublicCollectionSchema,
  PublicCollectionSummarySchema,
  type LotProductType,
  type PublicCollection,
  type PublicCollectionSort,
  type PublicCollectionStatus,
  type PublicCollectionSummary,
} from "@drinks-on-chain/mocks";
import { api } from "@/lib/api/client";
import { toPage, type Page, type PageParams } from "@/lib/api/envelope";
import { ApiError } from "@/lib/api/errors";

// ─────────────────────────────────────────────────────────────────────────────────────────────
// BORRADOR · catálogo de colecciones (2A)
//
// `GET /v1/public/collections` y `/{slug}` son un **borrador** (contrato de la Ola 2 §17.1): el
// backend no los implementa en esta ola y no están en su OpenAPI. Los fija el OpenAPI borrador de
// la Etapa 4 (O3-PK-1) y **pueden cambiar sin aviso**. Hoy solo responden los mocks (cabecera
// `X-Mock-Draft`), con precios y disponibilidad de ejemplo; el backend real responde 404.
//
// Desde la Ola 3 (contrato §13.1, mocks 0.6) cada colección lleva además `id` (el que recibe el
// pedido), `saleState` y `counts.available`; `status` y `availability.available` son sus nombres
// anteriores y se retirarán con el OpenAPI de la Etapa 4 (`src/lib/catalog/sale.ts`). El filtro de
// la lista sigue llamándose `status`.
//
// Todo lo que depende de esta forma vive en `src/lib/catalog`: si el borrador cambia, cambia aquí.
// ─────────────────────────────────────────────────────────────────────────────────────────────

export type CollectionSummary = PublicCollectionSummary;
export type Collection = PublicCollection;
export type CollectionStatus = PublicCollectionStatus;

export type CollectionFilters = {
  productType?: LotProductType;
  status?: CollectionStatus;
  /** `slug` de la bodega. */
  winery?: string;
  /** Busca en el nombre de la colección y de la bodega. */
  q?: string;
  /** Solo las destacadas (o solo las que no lo son). */
  featured?: boolean;
  /** Orden; por defecto `featured`: destacadas primero y después las más recientes. */
  sort?: CollectionSort;
};

export type CollectionSort = PublicCollectionSort;

/** [BORRADOR §17.1] `GET /v1/public/collections?productType=&winery=&status=&q=&featured=&sort=`. */
export async function fetchCollections(
  filters: CollectionFilters = {},
  page: PageParams = {},
  signal?: AbortSignal,
): Promise<Page<CollectionSummary>> {
  const data = await api("/v1/public/collections", { auth: false, signal, query: { ...filters, ...page } });
  return toPage(data, PublicCollectionSummarySchema, page);
}

/**
 * [BORRADOR §13.1] `GET /v1/public/collections/{winerySlug}/{slug}`: la ficha se resuelve por
 * bodega, porque el `slug` de una colección solo es único dentro de su bodega (mocks 0.6.0-rc.2).
 * La ruta de un solo segmento (`/{slug}`) está obsoleta y no se usa.
 */
export function fetchCollection(winerySlug: string, slug: string, signal?: AbortSignal): Promise<Collection> {
  return api(`/v1/public/collections/${encodeURIComponent(winerySlug)}/${encodeURIComponent(slug)}`, {
    auth: false,
    signal,
    schema: PublicCollectionSchema,
  });
}

/**
 * Colecciones del catálogo con ese `slug`, de cualquier bodega (para redirigir las direcciones
 * antiguas `/colecciones/{slug}`). Varias = ambiguo; ninguna, o un catálogo que aún no existe = 0.
 */
export async function findCollectionsBySlug(slug: string, signal?: AbortSignal): Promise<CollectionSummary[]> {
  const found: CollectionSummary[] = [];
  const limit = 100;
  for (let offset = 0; ; offset += limit) {
    let page: Page<CollectionSummary>;
    try {
      page = await fetchCollections({}, { limit, offset }, signal);
    } catch (error) {
      if (isCatalogUnavailable(error)) return [];
      throw error;
    }
    found.push(...page.items.filter((collection) => collection.slug === slug));
    if (offset + page.items.length >= page.total || page.items.length === 0) return found;
  }
}

/**
 * ¿El catálogo todavía no existe en este entorno? Un 404 o un 501 **de la lista** significa que el
 * backend aún no publica el borrador (lo esperado con `NEXT_PUBLIC_MOCKS=0` hasta la Etapa 4): la
 * pantalla dice "próximamente" en vez de mostrar un error.
 */
export function isCatalogUnavailable(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 501);
}
