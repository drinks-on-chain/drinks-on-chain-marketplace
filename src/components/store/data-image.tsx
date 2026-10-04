"use client";

import { useState, type ReactNode } from "react";
import { usableImageUrl } from "@/lib/images";

// Pendiente de mover a @drinks-on-chain/ui (imagen de los datos con respaldo).

/**
 * Imagen cuya URL llega en los datos (fotografía de una colección, logotipo de una bodega). Si no
 * hay URL que se pueda pedir, o la imagen falla al cargar, pinta `fallback` (la ilustración o el
 * monograma) en lugar de un hueco roto. Decorativa: el nombre va siempre en texto al lado.
 *
 * Es un `<img>` normal, no `next/image`: el origen no se conoce al construir y, con mocks, el
 * optimizador de Next no pasa por MSW.
 */
export function DataImage({
  src,
  fallback,
  className,
}: {
  src: string | null | undefined;
  fallback: ReactNode;
  className?: string;
}) {
  const url = usableImageUrl(src);
  const [failed, setFailed] = useState<string | null>(null);
  if (!url || failed === url) return fallback;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- ver el comentario del componente
    <img src={url} alt="" loading="lazy" className={className} onError={() => setFailed(url)} />
  );
}
