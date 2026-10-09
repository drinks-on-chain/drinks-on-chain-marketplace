import {
  ConsumerProfileSchema,
  SessionResponseSchema,
  type ConsumerProfile,
  type SessionResponse,
} from "@drinks-on-chain/mocks";
import { api, logoutSession } from "@/lib/api/client";
import { ContractError } from "@/lib/api/errors";
import { setSession } from "@/lib/api/session";

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 2B · Cuenta por correo (A-13). Solo existe con la bandera `NEXT_PUBLIC_MK_ACCOUNT`.
//
// - `login`, `forgot-password`, `reset-password`, `verify-email` y `resend-verification` son del
//   OpenAPI vigente (contrato de la Ola 1).
// - [BORRADOR §13.1] `signup` con términos, mayoría de edad, captcha y campo trampa, su respuesta
//   `202 { status: 'VERIFICATION_SENT' }` y `GET /v1/me/consumer` los fija el contrato de la Ola 4
//   y pueden cambiar. Hoy el alta del OpenAPI responde 201 con la sesión: se aceptan las dos.
//
// Sin passkeys, SMS ni proveedores sociales (R2, R6): correo y contraseña.
// ─────────────────────────────────────────────────────────────────────────────────────────────

export type { ConsumerProfile };

/** Longitud mínima de la contraseña (política del backend: `AUTH_WEAK_PASSWORD`). */
export const PASSWORD_MIN_LENGTH = 10;

/** La cuenta existe pero no es de consumidor (personal de una bodega o de la plataforma). */
export class NotConsumerError extends Error {
  constructor() {
    super("Esta cuenta no es de consumidor.");
    this.name = "NotConsumerError";
  }
}

const has = (data: unknown, key: string) => typeof data === "object" && data !== null && key in data;

/**
 * Abre la sesión del consumidor con la respuesta de `login` o `signup`. Un reto de segundo factor
 * (`mfa`: personal de la plataforma) o una sesión de otra audiencia no sirven aquí.
 */
async function openSession(path: string, data: unknown): Promise<void> {
  if (has(data, "mfa")) throw new NotConsumerError();
  const parsed = SessionResponseSchema.safeParse(data);
  if (!parsed.success) throw new ContractError(path, parsed.error.issues);
  const session: SessionResponse = parsed.data;
  setSession({ accessToken: session.tokens.accessToken, expiresIn: session.tokens.expiresIn });
  if (session.user.audience !== "CONSUMER") {
    // El backend abrió una sesión de personal: se cierra, aquí no se usa.
    await logoutSession();
    throw new NotConsumerError();
  }
}

/** `POST /v1/auth/login`: abre la sesión (acceso en memoria, renovación en la cookie `doc_rt`). */
export async function login(input: { email: string; password: string }): Promise<void> {
  const path = "/v1/auth/login";
  await openSession(path, await api<unknown>(path, { method: "POST", auth: false, body: input }));
}

export type SignupInput = {
  fullName: string;
  email: string;
  password: string;
  /** Declaraciones obligatorias: sin ellas el formulario no envía. */
  acceptTerms: true;
  ageDeclaration: true;
  captchaToken: string;
  /** Campo trampa: debe viajar vacío. */
  website: string;
};

export type SignupOutcome =
  /** [BORRADOR §13.1] 202: hay que confirmar el correo antes de entrar. */
  | { kind: "verification-sent" }
  /** OpenAPI vigente: 201 con la sesión abierta. */
  | { kind: "signed-in" };

/** [BORRADOR §13.1] `POST /v1/auth/signup` (solo consumidores). */
export async function signup(input: SignupInput): Promise<SignupOutcome> {
  const path = "/v1/auth/signup";
  const data = await api<unknown>(path, { method: "POST", auth: false, body: input });
  // Sin cuerpo o con `VERIFICATION_SENT`: falta confirmar el correo.
  if (data === undefined || data === null || has(data, "status")) return { kind: "verification-sent" };
  await openSession(path, data);
  return { kind: "signed-in" };
}

type CaptchaInput = { email: string; captchaToken: string; website: string };

/** `POST /v1/auth/forgot-password` → 202 siempre (no revela si el correo tiene cuenta). */
export function requestPasswordReset(input: CaptchaInput): Promise<void> {
  return api("/v1/auth/forgot-password", { method: "POST", auth: false, body: input }).then(() => undefined);
}

/** `POST /v1/auth/reset-password` → 204; cierra las demás sesiones de la cuenta. */
export function resetPassword(input: { token: string; password: string }): Promise<void> {
  return api("/v1/auth/reset-password", { method: "POST", auth: false, body: input }).then(() => undefined);
}

/**
 * `POST /v1/auth/verify-email`. Hoy responde 204; el borrador §13.1 prevé que devuelva la sesión
 * del consumidor: si llega, se abre. Devuelve si quedó con la sesión abierta.
 */
export async function verifyEmail(token: string): Promise<{ signedIn: boolean }> {
  const data = await api<unknown>("/v1/auth/verify-email", { method: "POST", auth: false, body: { token } });
  const session = SessionResponseSchema.safeParse(data);
  if (!session.success || session.data.user.audience !== "CONSUMER") return { signedIn: false };
  setSession({ accessToken: session.data.tokens.accessToken, expiresIn: session.data.tokens.expiresIn });
  return { signedIn: true };
}

/** `POST /v1/auth/resend-verification` → 202 siempre. */
export function resendVerification(input: CaptchaInput): Promise<void> {
  return api("/v1/auth/resend-verification", { method: "POST", auth: false, body: input }).then(() => undefined);
}

/** [BORRADOR §13.1] `GET /v1/me/consumer`: perfil con la dirección informativa de solo lectura. */
export function fetchConsumerProfile(signal?: AbortSignal): Promise<ConsumerProfile> {
  return api("/v1/me/consumer", { signal, schema: ConsumerProfileSchema });
}

/** Cierra la sesión en el backend (revoca la cookie) y en el navegador. */
export const logout = logoutSession;

/** Códigos de error que el formulario traduce (los demás usan el mensaje del backend). */
export const AUTH_ERROR_CODES = {
  invalidCredentials: "AUTH_INVALID_CREDENTIALS",
  tooManyAttempts: "AUTH_TOO_MANY_ATTEMPTS",
  weakPassword: "AUTH_WEAK_PASSWORD",
  captchaInvalid: "CAPTCHA_INVALID",
  resetTokenInvalid: "AUTH_RESET_TOKEN_INVALID",
  emailTokenInvalid: "AUTH_EMAIL_TOKEN_INVALID",
} as const;
