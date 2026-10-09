import {
  PublicCodePassportSchema,
  PublicDossierVerificationSchema,
  type PublicDossierVerification,
} from "@drinks-on-chain/mocks";
import { api } from "@/lib/api/client";
import { ApiError, NetworkError } from "@/lib/api/errors";
import { apiPathFrom } from "@/lib/api/paths";
import { apiBytes, apiText } from "@/lib/api/text";
import type { LotPassport, Passport, PassportState } from "./types";

// Pasaporte público (contrato de la Ola 2 §12.1 y §12.4): sin sesión, con límite de peticiones
// por la IP real del visitante (la firma `src/proxy.ts`).

/** Códigos de error del pasaporte público (contrato §12.1 y §12.4). */
export const PUB_CODE_NOT_FOUND = "PUB_CODE_NOT_FOUND";
export const PUB_CODE_MALFORMED = "PUB_CODE_MALFORMED";
export const PUB_TOO_MANY_LOOKUPS = "PUB_TOO_MANY_LOOKUPS";

/** `GET /v1/public/passports/{code}`: resuelve un código canónico de botella o de lote. */
export function fetchPassport(code: string, signal?: AbortSignal): Promise<Passport> {
  return api(`/v1/public/passports/${encodeURIComponent(code)}`, {
    auth: false,
    signal,
    schema: PublicCodePassportSchema,
  });
}

/** Ruta del expediente canónico de un lote (`GET /v1/public/lots/{lotCode}/dossier`, §12.1). */
export const dossierPath = (lotCode: string) => `/v1/public/lots/${encodeURIComponent(lotCode)}/dossier`;

/**
 * Bytes canónicos del expediente cerrado: el texto exacto sobre el que se calculó la huella.
 * `null` si el expediente sigue abierto (`dossier.canonicalUrl` vacío).
 *
 * `canonicalUrl` puede llegar como ruta (`/v1/…`) o como URL absoluta (cuando el backend defina
 * `API_PUBLIC_URL`): en los dos casos se pide por el proxy del propio origen. Si trae otra cosa,
 * se usa la ruta del contrato para ese lote.
 */
export function fetchCanonicalDossier(lot: LotPassport, signal?: AbortSignal): Promise<string> | null {
  if (!lot.dossier.canonicalUrl) return null;
  return apiText(apiPathFrom(lot.dossier.canonicalUrl) ?? dossierPath(lot.lotCode), { signal });
}

/** Los mismos bytes canónicos, sin decodificar: sobre ellos se recalcula la huella con WebCrypto. */
export function fetchCanonicalDossierBytes(lot: LotPassport, signal?: AbortSignal): Promise<Uint8Array> | null {
  if (!lot.dossier.canonicalUrl) return null;
  return apiBytes(apiPathFrom(lot.dossier.canonicalUrl) ?? dossierPath(lot.lotCode), { signal });
}

export type LotVerification = PublicDossierVerification;

/**
 * `GET /v1/public/lots/{lotCode}/verification` (contrato de la Ola 3 §7.3): las comprobaciones del
 * anclaje que hizo el servidor. `null` si el backend aún no la publica (404 o 501): el visor se
 * queda con lo que puede comprobar por sí mismo.
 */
export async function fetchLotVerification(lotCode: string, signal?: AbortSignal): Promise<LotVerification | null> {
  try {
    return await api(`/v1/public/lots/${encodeURIComponent(lotCode)}/verification`, {
      auth: false,
      signal,
      schema: PublicDossierVerificationSchema,
    });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 501)) return null;
    throw error;
  }
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
