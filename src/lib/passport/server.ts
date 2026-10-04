import { AsyncLocalStorage } from "node:async_hooks";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { PublicLotPassportSchema } from "@drinks-on-chain/mocks";
import { errorEnvelope, successEnvelope } from "@/lib/api/envelope";
import { signedClientHeaders } from "@/lib/api-proxy";
import { CLIENT_APP, CLIENT_APP_HEADER } from "@/lib/client-app";
import { resolveApiOrigin } from "@/lib/env";
import { PUB_CODE_MALFORMED } from "./api";
import type { LotPassport, PassportState } from "./types";

// Pasaporte de un LOTE pedido en el servidor (contrato de la Ola 2 §12.4), para que su contenido
// vaya en el HTML inicial y la página se pueda indexar. Solo servidor: lo usa `/b/[code]/page.tsx`
// cuando el código es de lote y hay backend (`NEXT_PUBLIC_MOCKS` ≠ 1). La botella individual
// sigue pidiéndose en el navegador (`usePassport`).
//
// Dos cosas que este módulo cuida:
//
// 1. **La IP de quien visita.** El freno a la enumeración (20 códigos inexistentes en 10 min) y el
//    límite de 60 consultas por minuto del backend son por IP real. Cada petición que sale de
//    aquí lleva la IP del visitante firmada, con las mismas cabeceras que `src/proxy.ts`
//    (`signedClientHeaders`): nunca cuentan todas contra la IP del servidor.
// 2. **La caché.** El backend publica el pasaporte con `Cache-Control: max-age=60` (3600 con el
//    lote certificado). Aquí se guarda ese mismo tiempo, **por código de lote**. La caché de
//    `fetch` de Next no sirve: su clave incluye las cabeceras, y las de la firma cambian en cada
//    visita. Por eso se usa `unstable_cache` (la clave es solo el código) y la identidad del
//    visitante viaja aparte, en un `AsyncLocalStorage`, hasta la petición que de verdad sale.
//    Solo se guardan respuestas correctas: un 404, un 429 o un fallo no se guardan nunca, así
//    que el freno de una persona no afecta a otra.

/** Segundos que se guarda un pasaporte, como el `Cache-Control` del backend (§12.4). */
export const LOT_REVALIDATE_SECONDS = 60;
export const CERTIFIED_LOT_REVALIDATE_SECONDS = 3600;

const REQUEST_TIMEOUT_MS = 8_000;

/** Estado del pasaporte pedido en el servidor (el mismo vocabulario que el visor en el navegador). */
export type ServerPassportResult =
  { status: "found"; passport: LotPassport } | Exclude<PassportState, { status: "loading" | "found" | "offline" }>;

type Failure = Exclude<ServerPassportResult, { status: "found" }>;

/** Fallo de la consulta, ya traducido; atraviesa `unstable_cache` sin guardarse. */
class PassportRequestError extends Error {
  constructor(readonly state: Failure) {
    super(`Pasaporte: ${state.status}`);
    this.name = "PassportRequestError";
  }
}

/** Quién visita (sus cabeceras) y las consultas en curso de esta petición. */
type Visit = { incoming: Headers; inflight: Map<string, Promise<LotPassport>> };
const visit = new AsyncLocalStorage<Visit>();

const lotPath = (lotCode: string) => `/v1/public/lots/${encodeURIComponent(lotCode)}`;

function retryAfterSeconds(res: Response): number | null {
  const raw = res.headers.get("Retry-After");
  const seconds = Number(raw);
  return raw && Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

/** `GET {API_ORIGIN}/v1/public/lots/{lotCode}` con la IP del visitante firmada. Lanza si no es un 200 válido. */
async function requestLot(lotCode: string): Promise<LotPassport> {
  const current = visit.getStore();
  if (!current) throw new PassportRequestError({ status: "error" });

  let origin: string | null;
  try {
    origin = resolveApiOrigin();
  } catch {
    origin = null;
  }
  if (!origin) throw new PassportRequestError({ status: "error" });

  const path = lotPath(lotCode);
  let res: Response;
  try {
    res = await fetch(`${origin}${path}`, {
      // La caché es la de `unstable_cache` (por código de lote), no la de `fetch` (por cabeceras).
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Accept: "application/json",
        "Accept-Language": "es",
        [CLIENT_APP_HEADER]: CLIENT_APP,
        ...signedClientHeaders(current.incoming, "GET", path, { secret: process.env.PROXY_SHARED_SECRET }),
      },
    });
  } catch {
    throw new PassportRequestError({ status: "error" });
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 429)
      throw new PassportRequestError({ status: "rate-limited", retryAfter: retryAfterSeconds(res) });
    const error = errorEnvelope.safeParse(body);
    if (error.success && error.data.error.code === PUB_CODE_MALFORMED) {
      throw new PassportRequestError({ status: "malformed" });
    }
    throw new PassportRequestError(res.status === 404 ? { status: "not-found" } : { status: "error" });
  }

  const envelope = successEnvelope.safeParse(body);
  const passport = envelope.success ? PublicLotPassportSchema.safeParse(envelope.data.data) : null;
  // Una respuesta que no cumple el contrato es un error, no un pasaporte a medias.
  if (!passport?.success) throw new PassportRequestError({ status: "error" });
  return passport.data;
}

/** Una sola petición por lote y visita, aunque la pidan las dos cachés. */
function requestLotOnce(lotCode: string): Promise<LotPassport> {
  const current = visit.getStore();
  if (!current) return requestLot(lotCode);
  let pending = current.inflight.get(lotCode);
  if (!pending) {
    pending = requestLot(lotCode);
    current.inflight.set(lotCode, pending);
  }
  return pending;
}

/** ¿El backend lo publica con la caché larga? (lote certificado: expediente cerrado). */
export const isCertified = (passport: LotPassport) => passport.stage === "CERTIFIED" || passport.stage === "ANCHORED";

// Caché larga: solo los lotes certificados. De los demás guarda `null` ("aún no"), y se consulta
// la corta; cuando el lote se certifica, pasa a la larga en la siguiente revalidación.
const certifiedLot = unstable_cache(
  async (lotCode: string): Promise<LotPassport | null> => {
    const passport = await requestLotOnce(lotCode);
    return isCertified(passport) ? passport : null;
  },
  ["public-lot-passport", "certified"],
  { revalidate: CERTIFIED_LOT_REVALIDATE_SECONDS },
);

const openLot = unstable_cache((lotCode: string) => requestLotOnce(lotCode), ["public-lot-passport", "open"], {
  revalidate: LOT_REVALIDATE_SECONDS,
});

/**
 * Pasaporte de un lote, pedido en el servidor por cuenta de quien visita. `incoming` son las
 * cabeceras de su petición (de ahí sale su IP). Nunca lanza: devuelve el estado para pintarlo.
 */
export async function loadLotPassport(lotCode: string, incoming: Headers): Promise<ServerPassportResult> {
  try {
    const passport = await visit.run(
      { incoming, inflight: new Map() },
      async () => (await certifiedLot(lotCode)) ?? (await openLot(lotCode)),
    );
    return { status: "found", passport };
  } catch (error) {
    return error instanceof PassportRequestError ? error.state : { status: "error" };
  }
}

/**
 * El pasaporte del lote para la petición en curso. `cache()` de React hace que `generateMetadata`
 * y la página compartan una sola consulta.
 */
export const getLotPassport = cache(async (lotCode: string): Promise<ServerPassportResult> =>
  loadLotPassport(lotCode, await headers()),
);
