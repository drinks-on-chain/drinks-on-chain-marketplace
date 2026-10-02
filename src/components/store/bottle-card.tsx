import Link from "next/link";
import { Badge, cn, focusRing } from "@drinks-on-chain/ui";
import type { CollectionStatus, CollectionSummary } from "@/lib/catalog/api";
import { es } from "@/lib/i18n/es";
import { usableImageUrl } from "@/lib/images";
import { routes } from "@/lib/links";
import { BottleArt } from "./bottle-art";
import { PriceTag } from "./price-tag";

// Pendiente de mover a @drinks-on-chain/ui (`BottleCard`, 05 §3.2 y maqueta 02-marketplace).
// [BORRADOR §17.1] Pinta una fila del borrador del catálogo.

export const STATUS_TONE: Record<CollectionStatus, "accent" | "success" | "neutral"> = {
  PRESALE: "accent",
  ON_SALE: "success",
  SOLD_OUT: "neutral",
};

/** Marco de la fotografía o, si no hay, la botella a tinta. */
export function CollectionArt({
  collection,
  className,
}: {
  collection: Pick<CollectionSummary, "imageUrl" | "productType">;
  className?: string;
}) {
  const image = usableImageUrl(collection.imageUrl);
  return (
    <div
      className={cn("grid place-items-center overflow-hidden rounded-lg border border-border bg-bg-sunken", className)}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- imágenes de un origen que no se conoce al construir
        <img src={image} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        <BottleArt productType={collection.productType} className="h-3/4" />
      )}
    </div>
  );
}

/** Tarjeta de una colección del catálogo: toda ella es el enlace a su ficha. */
export function BottleCard({ collection, headingLevel = 3 }: { collection: CollectionSummary; headingLevel?: 2 | 3 }) {
  const Heading = `h${headingLevel}` as const;
  return (
    <article className="group relative grid content-start gap-3">
      <CollectionArt collection={collection} className="aspect-[4/5]" />
      <div className="grid gap-1">
        <p className="m-0 font-ui text-2xs font-medium tracking-label text-fg-subtle uppercase">
          {es.productTypes[collection.productType]} · {collection.vintage}
        </p>
        <Heading className="m-0 font-display text-xl leading-tight font-medium">
          <Link
            href={routes.collection(collection.slug)}
            className={cn(
              "rounded-sm text-fg no-underline after:absolute after:inset-0 after:content-[''] group-hover:underline",
              focusRing,
            )}
          >
            {collection.name}
          </Link>
        </Heading>
        <p className="m-0 text-md text-fg-muted">{collection.winery.tradeName}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <PriceTag price={collection.price} />
          <Badge tone={STATUS_TONE[collection.status]}>{es.catalog.statuses[collection.status]}</Badge>
        </div>
      </div>
    </article>
  );
}
