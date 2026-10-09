import { z } from "zod";

// Variables públicas. Next las inyecta en tiempo de build, así que cada una se lee
// por su nombre literal (no con process.env[clave]).
const publicUrl = z.string().url().or(z.literal(""));

const schema = z.object({
  mocks: z.boolean(),
  /** Landing principal (dominio raíz). */
  urlLanding: publicUrl,
  /** Sitio de las bodegas (`bodegas.`). */
  urlBodegas: publicUrl,
  /** Origen público del propio Marketplace (`app.`): URL canónicas y la del QR. */
  urlApp: publicUrl,
  /**
   * Bandera de la cuenta por correo (2B) y la compra (2C), **apagada por defecto**. Sus rutas
   * (`/v1/me/consumer`, `/v1/orders`…) son un borrador que el backend aún no implementa: en
   * producción y en las previews contra el backend real no debe verse ni un botón.
   */
  account: z.boolean(),
  /** Clave pública de Cloudflare Turnstile; vacía = sin widget y token de prueba. */
  turnstileSiteKey: z.string(),
});

export const env = schema.parse({
  mocks: process.env.NEXT_PUBLIC_MOCKS === "1",
  urlLanding: process.env.NEXT_PUBLIC_URL_LANDING ?? "",
  urlBodegas: process.env.NEXT_PUBLIC_URL_BODEGAS ?? "",
  urlApp: process.env.NEXT_PUBLIC_URL_APP ?? "",
  account: process.env.NEXT_PUBLIC_MK_ACCOUNT === "1",
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
});

/** Las herramientas de desarrollo (/__mocks) existen en local y en demos con mocks. */
export const devToolsEnabled = process.env.NODE_ENV !== "production" || env.mocks;

/**
 * Prefijo de la API en el origen de la propia app (P-1, contrato de la Ola 0 §7). El cliente
 * llama a `/api/v1/*`; `src/proxy.ts` lo reescribe a `${API_ORIGIN}/v1/*` y la cookie de
 * renovación queda de primera parte. Con mocks, MSW intercepta `/api/v1/*` en el navegador.
 */
export const API_BASE = "/api";

const apiOriginSchema = z
  .string()
  .trim()
  .url("API_ORIGIN debe ser una URL, p. ej. https://api.ejemplo.bo")
  .refine((v) => /^https?:\/\//i.test(v), "API_ORIGIN debe empezar por http:// o https://")
  // Se toleran la barra final y un `/v1` final.
  .transform((v) => v.replace(/\/+$/, "").replace(/\/v1$/i, ""));

type ServerVars = { API_ORIGIN?: string; NEXT_PUBLIC_MOCKS?: string };

/**
 * Origen del backend para la reescritura de `src/proxy.ts` (variable de servidor
 * `API_ORIGIN`, nunca pública; `next.config.ts` la valida también al construir). Obligatoria salvo con `NEXT_PUBLIC_MOCKS=1`, donde no hay
 * reescritura y devuelve `null`. Solo se evalúa en el servidor (build y `next start`).
 */
export function resolveApiOrigin(
  vars: ServerVars = { API_ORIGIN: process.env.API_ORIGIN, NEXT_PUBLIC_MOCKS: process.env.NEXT_PUBLIC_MOCKS },
): string | null {
  const raw = vars.API_ORIGIN?.trim();
  if (!raw) {
    if (vars.NEXT_PUBLIC_MOCKS === "1") return null;
    throw new Error(
      "Falta API_ORIGIN (origen del backend, p. ej. https://136.243.223.39.sslip.io). " +
        "Defínela o arranca con NEXT_PUBLIC_MOCKS=1 para usar los datos de prueba.",
    );
  }
  const parsed = apiOriginSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  return parsed.data;
}
