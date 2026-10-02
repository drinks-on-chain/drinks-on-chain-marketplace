"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type ParamUpdates = Record<string, string | null | undefined>;

/**
 * Filtros persistentes en la URL: leer y cambiar parámetros con `router.replace` (sin entrada
 * nueva en el historial ni salto de scroll), para que una lista filtrada se pueda compartir y
 * sobreviva a la recarga. Un valor vacío o `null` quita el parámetro.
 */
export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const set = useCallback(
    (updates: ParamUpdates) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "") next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  /** Quita todos los parámetros. */
  const clear = useCallback(() => router.replace(pathname, { scroll: false }), [pathname, router]);

  return { params, set, clear };
}
