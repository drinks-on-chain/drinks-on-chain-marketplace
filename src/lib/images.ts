import { env } from "@/lib/env";

/**
 * URL de una imagen que se puede pedir, o `null` si no hay ninguna que mostrar.
 *
 * - Solo `http(s)` o rutas del propio origen: la URL llega en los datos y no se confía en ella.
 * - Las rutas `/mocks/uploads/…` de los datos de demostración solo existen con MSW activo (los
 *   handlers de `@drinks-on-chain/mocks` las sirven). La semilla del backend de desarrollo trae
 *   las mismas rutas y allí nadie las sirve: sin mocks se tratan como "sin imagen" y la pantalla
 *   pinta su ilustración, en vez de pedir un archivo que responde 404.
 */
export function usableImageUrl(url: string | null | undefined, mocks: boolean = env.mocks): string | null {
  if (!url) return null;
  if (url.startsWith("/mocks/")) return mocks ? url : null;
  if (url.startsWith("https://") || url.startsWith("http://")) return url;
  return url.startsWith("/") && !url.startsWith("//") ? url : null;
}
