/**
 * URL de una imagen que se puede pedir, o `null` si no hay ninguna que mostrar.
 *
 * - Solo `http(s)` o rutas del propio origen: la URL llega en los datos y no se confía en ella.
 * - Los datos de demostración (mocks y semilla del backend) traen rutas `/mocks/uploads/…` que
 *   nadie sirve: se tratan como "sin imagen" y la pantalla pinta su ilustración, en vez de pedir
 *   un archivo que responde 404.
 */
export function usableImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/mocks/")) return null;
  if (url.startsWith("https://") || url.startsWith("http://")) return url;
  return url.startsWith("/") && !url.startsWith("//") ? url : null;
}
