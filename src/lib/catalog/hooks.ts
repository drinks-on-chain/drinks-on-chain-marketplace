"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/errors";
import { fetchCollection, fetchCollections, type CollectionFilters } from "./api";
import { CATALOG_PAGE_SIZE } from "./filters";

// [BORRADOR §17.1] Hooks del catálogo: ver el aviso de `api.ts`.

// Un 4xx o un 501 no se arreglan repitiendo (el borrador puede no existir en el entorno).
const retry = (count: number, error: unknown) =>
  !(error instanceof ApiError && (error.status < 500 || error.status === 501)) && count < 2;

/** Lista del catálogo con filtros y página. */
export function useCollections(filters: CollectionFilters = {}, { limit = CATALOG_PAGE_SIZE, offset = 0 } = {}) {
  return useQuery({
    queryKey: ["public", "collections", filters, limit, offset] as const,
    queryFn: ({ signal }) => fetchCollections(filters, { limit, offset }, signal),
    staleTime: 60_000,
    retry,
    // Al cambiar de filtro o de página se ve la lista anterior hasta que llega la nueva.
    placeholderData: (previous) => previous,
  });
}

/** Ficha de una colección. */
export function useCollection(slug: string) {
  return useQuery({
    queryKey: ["public", "collections", "detail", slug] as const,
    queryFn: ({ signal }) => fetchCollection(slug, signal),
    staleTime: 60_000,
    retry,
  });
}
