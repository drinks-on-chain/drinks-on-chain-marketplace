import { PublicWineryProfileSchema, type PublicWineryProfile, type WineryCategory } from "@drinks-on-chain/mocks";
import { api } from "@/lib/api/client";
import { toPage, type Page, type PageParams } from "@/lib/api/envelope";

// Perfiles públicos de las bodegas `ACTIVE` (contrato de la Ola 1 §4 y de la Ola 2 §12.1). Sin
// sesión. Las dos rutas existen en el backend de desarrollo.

export type WineryProfile = PublicWineryProfile;

export type WineryFilters = { category?: WineryCategory; region?: string };

/** `GET /v1/public/wineries?region=&category=`: directorio, por nombre comercial. */
export async function fetchWineries(
  filters: WineryFilters = {},
  page: PageParams = {},
  signal?: AbortSignal,
): Promise<Page<WineryProfile>> {
  const data = await api("/v1/public/wineries", { auth: false, signal, query: { ...filters, ...page } });
  return toPage(data, PublicWineryProfileSchema, page);
}

/** `GET /v1/public/wineries/{slug}`: 404 si no existe o no está activa. */
export function fetchWinery(slug: string, signal?: AbortSignal): Promise<WineryProfile> {
  return api(`/v1/public/wineries/${encodeURIComponent(slug)}`, {
    auth: false,
    signal,
    schema: PublicWineryProfileSchema,
  });
}
