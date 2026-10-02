"use client";

import { useQuery } from "@tanstack/react-query";
import { NetworkError } from "@/lib/api/errors";
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
 * Un código inexistente cuenta para el límite de búsquedas del backend: no se repite solo.
 */
export function usePassport(code: string): PassportQuery {
  const query = useQuery({
    queryKey: passportQueryKey(code),
    queryFn: ({ signal }) => fetchPassport(code, signal),
    // El backend cachea 60 s (§12.4); aquí no hace falta volver a pedirlo antes.
    staleTime: 60_000,
    // Solo se reintenta sola una caída de red. Una respuesta de error del servidor (también 5xx o
    // 501) no: cada consulta cuenta para el límite por IP, y la pantalla ofrece "Reintentar".
    retry: (count, error) => error instanceof NetworkError && count < 2,
  });
  return {
    state: toPassportState(query),
    retry: () => void query.refetch(),
    retrying: query.isRefetching,
  };
}
