// Interfaz entre el visor (`/b/{código}`) y sus datos. El visor solo conoce esta unión de
// estados; de dónde salen (hoy `GET /v1/public/passports/{code}`) es cosa de `api.ts`.

/**
 * Pasaporte público tal como lo devuelve la API (contrato de la Ola 2 §12.2).
 *
 * FASE 2: sustituir por la unión `PublicBottlePassport | PublicLotPassport` de
 * `@drinks-on-chain/mocks` (dominio `public`, 0.5.0) y pasar su esquema zod a `fetchPassport`.
 * Hasta entonces no se inventa la forma: es `unknown` y el visor no lee nada de dentro.
 */
export type Passport = unknown;

/** Estado de la consulta de un código, ya traducido para la pantalla. */
export type PassportState =
  /** Consultando. */
  | { status: "loading" }
  /** El código existe. */
  | { status: "found"; passport: Passport }
  /** 404 `PUB_CODE_NOT_FOUND`: forma correcta, pero no figura en el registro. */
  | { status: "not-found" }
  /** 422 `PUB_CODE_MALFORMED`: el servidor no lo reconoce como código. */
  | { status: "malformed" }
  /** 429 (`PUB_TOO_MANY_LOOKUPS` o límite por minuto): `retryAfter` en segundos si llega. */
  | { status: "rate-limited"; retryAfter: number | null }
  /** Sin red. */
  | { status: "offline" }
  /** Cualquier otro fallo (5xx, respuesta inesperada). */
  | { status: "error" };

export type PassportStatus = PassportState["status"];

/** Lo que el visor necesita de la consulta: el estado y cómo repetirla. */
export type PassportQuery = {
  state: PassportState;
  /** Vuelve a consultar (botón "Reintentar"). */
  retry: () => void;
  /** Hay un reintento en curso (el estado anterior sigue en pantalla). */
  retrying: boolean;
};
