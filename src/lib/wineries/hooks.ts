"use client";

import { useQuery } from "@tanstack/react-query";
import { MAX_PAGE_SIZE } from "@/lib/api/pagination";
import { fetchWineries, fetchWinery, type WineryFilters } from "./api";

/** Directorio de bodegas activas (una página de hasta 100; la red del MVP cabe de sobra). */
export function useWineries(filters: WineryFilters = {}) {
  return useQuery({
    queryKey: ["public", "wineries", filters] as const,
    queryFn: ({ signal }) => fetchWineries(filters, { limit: MAX_PAGE_SIZE, offset: 0 }, signal),
    staleTime: 60_000,
  });
}

/** Perfil público de una bodega. */
export function useWinery(slug: string) {
  return useQuery({
    queryKey: ["public", "wineries", "detail", slug] as const,
    queryFn: ({ signal }) => fetchWinery(slug, signal),
    staleTime: 60_000,
  });
}
