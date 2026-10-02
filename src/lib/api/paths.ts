import { API_BASE } from "@/lib/env";

// Rutas de la API que llegan **dentro de los datos** (`dossier.canonicalUrl`,
// `publicAttachments[].url`). Hoy son relativas (`/v1/public/lots/…/dossier`), pero el OpenAPI las
// documenta como URL absolutas y el backend las devolverá así cuando defina `API_PUBLIC_URL`.
// Se aceptan las dos formas y se piden siempre por el proxy del propio origen (`/api/v1/*`), que
// firma la IP del visitante.

const API_PATH = /^\/v1\//;

/**
 * Ruta de la API (`/v1/…`, con su query) de una URL relativa o absoluta; `null` si no apunta a la
 * API (otra ruta, otro esquema o un texto que no es una URL).
 */
export function apiPathFrom(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/") && !url.startsWith("//")) {
    // También vale si ya trae el prefijo del proxy (`/api/v1/…`).
    const path = url.startsWith(`${API_BASE}/v1/`) ? url.slice(API_BASE.length) : url;
    return API_PATH.test(path) ? path : null;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  // Con un prefijo delante (`https://api…/api/v1/…`) se toma desde `/v1/`.
  const at = parsed.pathname.indexOf("/v1/");
  return at === -1 ? null : `${parsed.pathname.slice(at)}${parsed.search}`;
}

/**
 * Dirección que puede abrir el navegador para un archivo de la API: por el proxy propio si es una
 * ruta de la API; tal cual si es otra URL `http(s)`; `null` si no es ninguna de las dos.
 */
export function apiHref(url: string | null | undefined): string | null {
  const path = apiPathFrom(url);
  if (path) return `${API_BASE}${path}`;
  return url && /^https?:\/\//i.test(url) ? url : null;
}
