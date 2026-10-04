import { Skeleton, cn } from "@drinks-on-chain/ui";
import type { CollectionSummary } from "@/lib/catalog/api";
import { es } from "@/lib/i18n/es";
import { BottleCard } from "../store/bottle-card";

// [BORRADOR §17.1] Rejilla de colecciones del catálogo: 2 columnas en móvil, 3 y 4 en escritorio.

const GRID = "m-0 grid list-none grid-cols-2 gap-x-4 gap-y-8 p-0 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4";

export function CollectionGrid({
  collections,
  headingLevel = 3,
  className,
}: {
  collections: CollectionSummary[];
  headingLevel?: 2 | 3;
  className?: string;
}) {
  return (
    <ul className={cn(GRID, className)}>
      {collections.map((collection) => (
        <li key={collection.slug}>
          <BottleCard collection={collection} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}

/** Esqueleto de la rejilla mientras carga (no un spinner a pantalla completa). */
export function CollectionGridSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{es.common.loading}</span>
      <div className={GRID} aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="grid gap-3">
            <Skeleton shape="block" className="aspect-[4/5] h-auto rounded-lg" />
            <Skeleton className="w-1/3" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
