"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPassport, passportErrorState } from "./api";
import type { Passport, PassportQuery, PassportState } from "./types";

export const passportQueryKey = (code: string) => ["public", "passports", code] as const;

/** Estado del visor a partir de la consulta (puro, para las pruebas). */
export function toPassportState(query: {
  isPending: boolean;
  error: unknown;
  data: Passport | undefined;
}): PassportState {
  if (query.isPending) return { status: "loading" };
  if (query.error) return passportErrorState(query.error);
  return { status: "found", passport: query.data };
}

/**
 * Consulta el pasaporte de un código **canónico** (ya normalizado con `parseCode`).
 * Los 4xx no se reintentan solos (`makeQueryClient`): un código inexistente cuenta para el
 * límite de búsquedas del backend.
 */
export function usePassport(code: string): PassportQuery {
  const query = useQuery({
    queryKey: passportQueryKey(code),
    queryFn: ({ signal }) => fetchPassport(code, signal),
    // El backend cachea 60 s (§12.4); aquí no hace falta volver a pedirlo antes.
    staleTime: 60_000,
  });
  return {
    state: toPassportState(query),
    retry: () => void query.refetch(),
    retrying: query.isRefetching,
  };
}
