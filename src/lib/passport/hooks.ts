"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NetworkError } from "@/lib/api/errors";
import {
  anchorChecks,
  anchorStage,
  recomputeFingerprint,
  type AnchorCheck,
  type AnchorStage,
  type FingerprintResult,
} from "./anchor";
import {
  fetchCanonicalDossier,
  fetchCanonicalDossierBytes,
  fetchLotVerification,
  fetchPassport,
  passportErrorState,
  type LotVerification,
} from "./api";
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

/**
 * Bytes canónicos del expediente cerrado de un lote. Una sola descarga por lote y huella: la
 * comparten la comprobación de la botella y la del anclaje.
 */
export const dossierBytesQuery = (lot: LotPassport) => ({
  queryKey: ["public", "dossier-bytes", lot.lotCode, lot.dossier.hash] as const,
  queryFn: async ({ signal }: { signal?: AbortSignal }) =>
    (await fetchCanonicalDossierBytes(lot, signal)) ?? new Uint8Array(),
  staleTime: Infinity,
  retry: retryOnlyNetwork,
});

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
  const queryClient = useQueryClient();
  // Con un pasaporte de lote no hay nada que comprobar: la consulta queda desactivada.
  const bottle: BottlePassport | null =
    passport.kind === "BOTTLE" && passport.bottle.merkleProof && passport.lot.dossier.canonicalUrl ? passport : null;
  const enabled = bottle !== null;
  const query = useQuery({
    queryKey: ["public", "bottle-proof", bottle?.bottle.code ?? null, bottle?.lot.dossier.hash ?? null] as const,
    enabled,
    staleTime: Infinity,
    retry: retryOnlyNetwork,
    queryFn: async (): Promise<BottleProofResult> => {
      if (!bottle) return { status: "unsupported" };
      const bytes = await queryClient.fetchQuery(dossierBytesQuery(bottle.lot));
      // Sin quitar una posible marca de orden de bytes: la huella es de los bytes tal cual.
      return verifyBottleProof(bottle, new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes));
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

// ─── Anclaje en la red (contrato de la Ola 3 §7.3) ───────────────────────────────────────────

/** Recálculo de la huella en el navegador. */
export type FingerprintState =
  | { status: "idle" }
  | { status: "checking" }
  | FingerprintResult
  /** No se pudo descargar el expediente. */
  | { status: "failed" };

/** De dónde salen las comprobaciones que se muestran. */
export type AnchorChecksSource =
  /** Aún consultando al servidor. */
  | "loading"
  /** Las del servidor (`…/verification`). */
  | "server"
  /** El backend aún no publica la verificación (404 o 501): las propias del visor. */
  | "viewer"
  /** La consulta falló (red, límite, 5xx): las propias del visor, con reintento. */
  | "viewer-after-error";

export type AnchorVerificationQuery = {
  stage: AnchorStage;
  fingerprint: FingerprintState;
  checks: AnchorCheck[];
  checksSource: AnchorChecksSource;
  /** Respuesta del servidor, si llegó (cuenta oficial, cuándo lo comprobó). */
  verification: LotVerification | null;
  retryFingerprint: () => void;
  retryChecks: () => void;
};

/**
 * Verificación del anclaje de un lote. Solo trabaja con el anclaje **confirmado**: sin anclaje
 * (expediente abierto, o un backend que aún responde `anchor: null`) y con el anclaje pendiente no
 * se pide nada. Con él, descarga los bytes canónicos, recalcula su SHA-256 con WebCrypto y pide
 * las comprobaciones del servidor, tolerando que esa ruta todavía no exista.
 */
export function useAnchorVerification(lot: LotPassport): AnchorVerificationQuery {
  const queryClient = useQueryClient();
  const stage = anchorStage(lot);
  const enabled = stage === "anchored";
  const anchor = lot.dossier.anchor;

  const fingerprint = useQuery({
    queryKey: ["public", "anchor-fingerprint", lot.lotCode, lot.dossier.hash, anchor?.memoHashHex ?? null] as const,
    enabled,
    staleTime: Infinity,
    retry: retryOnlyNetwork,
    queryFn: async (): Promise<FingerprintResult> =>
      recomputeFingerprint(await queryClient.fetchQuery(dossierBytesQuery(lot)), {
        dossierHash: lot.dossier.hash,
        memoHashHex: anchor?.memoHashHex ?? null,
      }),
  });

  const server = useQuery({
    queryKey: ["public", "lot-verification", lot.lotCode, anchor?.txHash ?? null] as const,
    enabled,
    // Un anclaje confirmado ya no cambia (el backend lo publica con una hora de caché).
    staleTime: 3_600_000,
    retry: retryOnlyNetwork,
    queryFn: ({ signal }) => fetchLotVerification(lot.lotCode, signal),
  });

  const verification = server.data ?? null;
  const checksSource: AnchorChecksSource = !enabled
    ? "viewer"
    : server.isPending
      ? "loading"
      : server.isError
        ? "viewer-after-error"
        : verification
          ? "server"
          : "viewer";

  return {
    stage,
    fingerprint: !enabled
      ? { status: "idle" }
      : fingerprint.isPending
        ? { status: "checking" }
        : fingerprint.error || !fingerprint.data
          ? { status: "failed" }
          : fingerprint.data,
    checks: anchorChecks(lot, verification),
    checksSource,
    verification,
    retryFingerprint: () => {
      // La descarga guardada pudo ser la que no cuadra: se pide otra vez.
      void queryClient
        .invalidateQueries({ queryKey: dossierBytesQuery(lot).queryKey })
        .then(() => fingerprint.refetch());
    },
    retryChecks: () => void server.refetch(),
  };
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
