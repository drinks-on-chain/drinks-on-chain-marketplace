"use client";

import Link from "next/link";
import { Badge, TextLink } from "@drinks-on-chain/ui";
import type { CollectionSummary } from "@/lib/catalog/api";
import { useCollections } from "@/lib/catalog/hooks";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";
import { CollectionGrid, CollectionGridSkeleton } from "../catalog/collection-grid";

// Destacados de la portada. [BORRADOR §17.1] El catálogo no tiene todavía un "destacado" propio:
// se piden las primeras colecciones y se ordenan a la venta → preventa → agotadas.

const FEATURED = 4;
const ORDER = { ON_SALE: 0, PRESALE: 1, SOLD_OUT: 2 } as const;

export const pickFeatured = (collections: CollectionSummary[], count = FEATURED) =>
  [...collections].sort((a, b) => ORDER[a.status] - ORDER[b.status]).slice(0, count);

/** Catálogo que aún no existe en el entorno (o vacío, o caído): el aviso sobrio de "próximamente". */
function CatalogTeaser() {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="destacados-titulo" className="m-0 font-display text-2xl font-medium md:text-3xl">
          {es.home.catalogTitle}
        </h2>
        <Badge>{es.common.soon}</Badge>
      </div>
      <p className="mt-2 mb-0 max-w-[52ch] text-lg leading-editorial text-fg-muted">{es.home.catalogBody}</p>
      <TextLink asChild variant="inline" className="mt-3 inline-flex min-h-11 items-center text-lg">
        <Link href={routes.catalog}>{es.home.catalogLink}</Link>
      </TextLink>
    </>
  );
}

export function Featured() {
  const collections = useCollections({}, { limit: 12 });
  const featured = pickFeatured(collections.data?.items ?? []);
  // Sin catálogo (el backend aún no lo publica), caído o vacío: la portada no enseña un error.
  const soon = collections.isError || (collections.isSuccess && featured.length === 0);

  return (
    <section aria-labelledby="destacados-titulo" className="border-t border-border py-10 md:py-14">
      {soon ? (
        <CatalogTeaser />
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
