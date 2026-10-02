"use client";

import { useQuery } from "@tanstack/react-query";
import { NetworkError } from "@/lib/api/errors";
import { fetchCanonicalDossier, fetchPassport, passportErrorState } from "./api";
import type { BottlePassport, LotPassport, Passport, PassportQuery, PassportState } from "./types";
import { verifyBottleProof, type BottleProofResult } from "./verify";

export const passportQueryKey = (code: string) => ["public", "passports", code] as const;

/** Estado del visor a partir de la consulta (puro, para las pruebas). */
export function toPassportState(query: {
  isPending: boolean;
  error: unknown;
  data: Passport | undefined;
}): PassportState {
  if (query.isPending) return { status: "loading" };
  if (query.error || query.data === undefined) return passportErrorState(query.error);
  return { status: "found", passport: query.data };
}

// Solo se reintenta sola una caída de red. Una respuesta de error del servidor (también 5xx o
// 501) no: cada consulta cuenta para el límite por IP, y la pantalla ofrece "Reintentar".
export const retryOnlyNetwork = (count: number, error: unknown) => error instanceof NetworkError && count < 2;

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
    retry: retryOnlyNetwork,
  });
  return {
    state: toPassportState(query),
    retry: () => void query.refetch(),
    retrying: query.isRefetching,
  };
}

/** Estado de la comprobación de una botella contra el expediente cerrado. */
export type BottleProofState =
  /** El pasaporte no trae prueba: el expediente sigue abierto o el código está anulado. */
  | { status: "none" }
  | { status: "checking" }
  | BottleProofResult
  /** No se pudo descargar el expediente. */
  | { status: "failed" };

export type BottleProofQuery = { state: BottleProofState; retry: () => void };

/**
 * Descarga el expediente canónico y comprueba en el navegador que el código de la botella está
 * en él (`verifyBottleProof`). Solo se lanza si el pasaporte es de botella y trae la prueba.
 */
export function useBottleProof(passport: Passport): BottleProofQuery {
  // Con un pasaporte de lote no hay nada que comprobar: la consulta queda desactivada.
  const bottle: BottlePassport | null =
    passport.kind === "BOTTLE" && passport.bottle.merkleProof && passport.lot.dossier.canonicalUrl ? passport : null;
  const enabled = bottle !== null;
  const query = useQuery({
    queryKey: ["public", "bottle-proof", bottle?.bottle.code ?? null, bottle?.lot.dossier.hash ?? null] as const,
    enabled,
    staleTime: Infinity,
    retry: retryOnlyNetwork,
    queryFn: async ({ signal }): Promise<BottleProofResult> => {
      if (!bottle) return { status: "unsupported" };
      return verifyBottleProof(bottle, (await fetchCanonicalDossier(bottle.lot, signal)) ?? "");
    },
  });
  const state: BottleProofState = !enabled
    ? { status: "none" }
    : query.isPending
      ? { status: "checking" }
      : query.error || !query.data
        ? { status: "failed" }
        : query.data;
  return { state, retry: () => void query.refetch() };
}

/** Descarga el expediente canónico (JSON) como archivo, para recalcular la huella por cuenta propia. */
export async function downloadCanonicalDossier(lot: LotPassport): Promise<void> {
  const text = await fetchCanonicalDossier(lot);
  if (text === null) return;
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `expediente-${lot.lotCode}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
