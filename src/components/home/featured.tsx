"use client";

import Link from "next/link";
import { Badge, TextLink } from "@drinks-on-chain/ui";
import { useCollections } from "@/lib/catalog/hooks";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";
import { CollectionGrid, CollectionGridSkeleton } from "../catalog/collection-grid";

// Destacados de la portada. [BORRADOR §17.1] Las elige el catálogo (`featured`): se piden solo
// las destacadas, en su orden; aquí no se ordena ni se decide nada.

const FEATURED = 4;

/** Catálogo que aún no existe en el entorno (o sin destacadas, o caído): el aviso sobrio. */
function CatalogTeaser({ soon }: { soon: boolean }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="destacados-titulo" className="m-0 font-display text-2xl font-medium md:text-3xl">
          {es.home.catalogTitle}
        </h2>
        {soon ? <Badge>{es.common.soon}</Badge> : null}
      </div>
      <p className="mt-2 mb-0 max-w-[52ch] text-lg leading-editorial text-fg-muted">
        {soon ? es.home.catalogBody : es.home.featuredBody}
      </p>
      <TextLink asChild variant="inline" className="mt-3 inline-flex min-h-11 items-center text-lg">
        <Link href={routes.catalog}>{es.home.catalogLink}</Link>
      </TextLink>
    </>
  );
}

export function Featured() {
  const collections = useCollections({ featured: true }, { limit: FEATURED });
  const featured = collections.data?.items ?? [];

  return (
    <section aria-labelledby="destacados-titulo" className="border-t border-border py-10 md:py-14">
      {collections.isError ? (
        // Sin catálogo (el backend aún no lo publica) o caído: la portada no enseña un error.
        <CatalogTeaser soon />
      ) : collections.isSuccess && featured.length === 0 ? (
        // Hay catálogo pero nada destacado: se invita a recorrerlo.
        <CatalogTeaser soon={false} />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
              <h2 id="destacados-titulo" className="m-0 font-display text-2xl font-medium md:text-3xl">
                {es.home.featuredTitle}
              </h2>
              <p className="mt-1 mb-0 text-lg text-fg-muted">{es.home.featuredBody}</p>
            </div>
            <TextLink asChild variant="inline" className="inline-flex min-h-11 items-center text-lg">
              <Link href={routes.catalog}>{es.home.featuredLink}</Link>
            </TextLink>
          </div>
          {collections.isPending ? (
            <CollectionGridSkeleton count={FEATURED} />
          ) : (
            <CollectionGrid collections={featured} />
          )}
        </>
      )}
    </section>
  );
}
