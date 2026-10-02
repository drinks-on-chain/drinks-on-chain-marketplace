"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { Badge, Button, EmptyState, ErrorState, Skeleton, TextLink } from "@drinks-on-chain/ui";
import { ApiError, errorMessage } from "@/lib/api/errors";
import type { Collection } from "@/lib/catalog/api";
import { useCollection } from "@/lib/catalog/hooks";
import { env } from "@/lib/env";
import { fmtDate, fmtNumber } from "@/lib/format";
import { es } from "@/lib/i18n/es";
import { links, routes } from "@/lib/links";
import { CollectionArt, STATUS_TONE } from "../store/bottle-card";
import { JourneyTimeline } from "../store/journey-timeline";
import { PriceTag } from "../store/price-tag";

// 2A · Ficha de una colección.
// [BORRADOR §17.1] Pinta el borrador del catálogo: precio que puede faltar, disponibilidad,
// estados PRESALE / ON_SALE / SOLD_OUT y la línea de tiempo del lote. Sin compra ni cuenta en
// esta ola: la llamada a la acción es "Avísame", hacia la lista de espera de la landing.

const t = es.catalog;

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-border pt-8">
      <h2 id={id} className="m-0 mb-3 font-display text-2xl leading-tight font-medium md:text-3xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Disponibilidad en palabras, sin cifras inventadas. */
function availabilityText(collection: Collection): string {
  const { available, total } = collection.availability;
  if (collection.status === "SOLD_OUT" || available === 0) return t.soldOut;
  return t.available(fmtNumber(available), fmtNumber(total));
}

export function CollectionDetail({ collection }: { collection: Collection }) {
  return (
    <article className="px-5 py-8 md:px-8 md:py-14">
      <div className="grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-14">
        <CollectionArt collection={collection} className="aspect-[4/5] max-h-[70vh] w-full md:sticky md:top-24" />

        <div className="grid content-start gap-8">
          <header>
            <p className="m-0 font-display text-sm tracking-[0.3em] text-fg-muted uppercase">
              {es.productTypes[collection.productType]} · {es.passport.vintage(collection.vintage)}
            </p>
            <h1 className="m-0 mt-3 font-display text-4xl leading-[1.1] font-medium text-balance lining-nums md:text-5xl">
              {collection.name}
            </h1>
            <p className="m-0 mt-2 text-lg text-fg-muted">
              <TextLink asChild variant="inline" className="inline-flex min-h-11 items-center">
                <Link href={routes.winery(collection.winery.slug)}>{collection.winery.tradeName}</Link>
              </TextLink>
              <span className="block">{collection.winery.region}</span>
            </p>
          </header>

          <div className="grid gap-3 rounded-lg border border-border bg-bg-raised p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <p className="m-0 flex flex-wrap items-baseline gap-x-2">
                <PriceTag price={collection.price} size="lg" />
                {collection.price ? <span className="font-ui text-sm text-fg-muted">{t.pricePerBottle}</span> : null}
              </p>
              <Badge tone={STATUS_TONE[collection.status]} size="lg">
                {t.statuses[collection.status]}
              </Badge>
            </div>
            <ul className="m-0 grid list-none gap-1 p-0 font-ui text-sm text-fg-muted">
              <li>{availabilityText(collection)}</li>
              <li>
                {t.lotStage}: {t.lotStages[collection.lotStage] ?? collection.lotStage}
              </li>
              {collection.estimatedReadyDate ? <li>{t.readyDate(fmtDate(collection.estimatedReadyDate))}</li> : null}
            </ul>
            {links.waitlist ? (
              <>
                <Button asChild size="lg" block className="mt-2">
                  <a href={links.waitlist}>{t.notify}</a>
                </Button>
                <p className="m-0 font-ui text-sm text-fg-muted">{t.notifyBody}</p>
              </>
            ) : (
              <p className="m-0 font-ui text-sm text-fg-muted">{t.notifySoon}</p>
            )}
            {env.mocks ? (
              <p className="m-0 font-ui text-xs text-fg-subtle">
                {es.common.demoData} · {t.draftNote}
              </p>
            ) : null}
          </div>

          <Block id="coleccion" title={t.about}>
            <p className="m-0 text-lg leading-editorial">{collection.description}</p>
          </Block>
          <Block id="cata" title={t.tastingNotes}>
            <p className="m-0 text-lg leading-editorial">{collection.tastingNotes}</p>
          </Block>
          <Block id="maridaje" title={t.pairing}>
            <p className="m-0 text-lg leading-editorial">{collection.pairing}</p>
          </Block>
          <Block id="lote" title={t.journey}>
            <JourneyTimeline events={collection.lot.timeline} />
            <p className="m-0 mt-5 text-md">
              {collection.lot.lotCode ? (
                <TextLink asChild variant="inline" className="inline-flex min-h-11 items-center">
                  <Link href={routes.passport(collection.lot.lotCode)}>{t.passportLink}</Link>
                </TextLink>
              ) : (
                <span className="text-fg-muted">{t.passportPending}</span>
              )}
            </p>
          </Block>
        </div>
      </div>
    </article>
  );
}

function BackToCatalog() {
  return (
    <Button asChild variant="secondary" size="lg">
      <Link href={routes.catalog}>{t.back}</Link>
    </Button>
  );
}

export function CollectionScreen({ slug }: { slug: string }) {
  const collection = useCollection(slug);

  if (collection.isPending) {
    return (
      <div role="status" aria-busy="true" className="px-5 py-8 md:px-8 md:py-14">
        <span className="sr-only">{es.common.loading}</span>
        <div className="grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-14" aria-hidden="true">
          <Skeleton shape="block" className="aspect-[4/5] h-auto max-h-[70vh] rounded-lg" />
          <div className="grid content-start gap-4">
            <Skeleton className="w-1/3" />
            <Skeleton className="h-10 w-4/5" />
            <Skeleton className="w-1/2" />
            <Skeleton shape="block" className="h-40" />
            <Skeleton shape="block" className="h-28" />
          </div>
        </div>
      </div>
    );
  }

  if (collection.isError) {
    // Un 404 es "esa colección no existe" (o el catálogo aún no está publicado en este entorno).
    const notFound = collection.error instanceof ApiError && collection.error.isNotFound;
    return (
      <div className="mx-auto w-full max-w-[46rem] px-5 py-10 md:px-8 md:py-16">
        <h1 className="sr-only">{t.title}</h1>
        {notFound ? (
          <EmptyState
            icon={<SearchX aria-hidden />}
            title={t.notFoundTitle}
            description={t.notFoundBody}
            action={<BackToCatalog />}
          />
        ) : (
          <ErrorState
            title={t.errorTitle}
            description={errorMessage(collection.error)}
            onRetry={() => void collection.refetch()}
            retrying={collection.isRefetching}
            retryLabel={es.common.retry}
          />
        )}
      </div>
    );
  }

  return <CollectionDetail collection={collection.data} />;
}
