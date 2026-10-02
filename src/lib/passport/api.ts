import { api } from "@/lib/api/client";
import { ApiError, NetworkError } from "@/lib/api/errors";
import type { Passport, PassportState } from "./types";

// Pasaporte público (contrato de la Ola 2 §12.1 y §12.4): sin sesión, con límite de peticiones
// por la IP real del visitante (la firma `src/proxy.ts`).

/** Códigos de error del pasaporte público (contrato §12.1 y §12.4). */
export const PUB_CODE_NOT_FOUND = "PUB_CODE_NOT_FOUND";
export const PUB_CODE_MALFORMED = "PUB_CODE_MALFORMED";
export const PUB_TOO_MANY_LOOKUPS = "PUB_TOO_MANY_LOOKUPS";

/**
 * `GET /v1/public/passports/{code}`: resuelve un código canónico de botella o de lote.
 *
 * FASE 2: añadir `schema` con el esquema zod del dominio `public` de `@drinks-on-chain/mocks`
 * para que `data` llegue validado y tipado (hoy se devuelve tal cual, como `unknown`).
 */
export function fetchPassport(code: string, signal?: AbortSignal): Promise<Passport> {
  return api<Passport>(`/v1/public/passports/${encodeURIComponent(code)}`, { auth: false, signal });
}

/** Traduce un fallo de la consulta al estado que pinta el visor. */
export function passportErrorState(error: unknown): Exclude<PassportState, { status: "loading" | "found" }> {
  if (error instanceof NetworkError) return { status: "offline" };
  if (error instanceof ApiError) {
    if (error.status === 429) return { status: "rate-limited", retryAfter: error.retryAfter ?? null };
    if (error.code === PUB_CODE_MALFORMED) return { status: "malformed" };
    if (error.code === PUB_CODE_NOT_FOUND || error.isNotFound) return { status: "not-found" };
  }
  return { status: "error" };
}
