"use client";

import Link from "next/link";
import { ExternalLink, SearchX } from "lucide-react";
import { Button, EmptyState, ErrorState, Skeleton, TextLink } from "@drinks-on-chain/ui";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { isCatalogUnavailable } from "@/lib/catalog/api";
import { useCollections } from "@/lib/catalog/hooks";
import { env } from "@/lib/env";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";
import type { WineryProfile } from "@/lib/wineries/api";
import { useWinery } from "@/lib/wineries/hooks";
import { CollectionGrid, CollectionGridSkeleton } from "../catalog/collection-grid";
import { WineryMark } from "./wineries-screen";

// Página de una bodega (`GET /v1/public/wineries/{slug}`, real en el backend) con sus colecciones
// del catálogo ([BORRADOR §17.1]: si el catálogo aún no existe, la sección no aparece).

const t = es.wineries;

/** Solo se enlazan sitios web con `http(s)`. */
const safeWebsite = (url: string | null) => (url && /^https?:\/\//i.test(url) ? url : null);

function WineryCollections({ slug }: { slug: string }) {
  const collections = useCollections({ winery: slug });
  if (collections.isError && isCatalogUnavailable(collections.error)) return null;
  return (
    <section aria-labelledby="colecciones" className="mt-12 border-t border-border pt-8">
      <h2 id="colecciones" className="m-0 mb-6 font-display text-2xl leading-tight font-medium md:text-3xl">
        {t.collections}
      </h2>
      {collections.isPending ? (
        <CollectionGridSkeleton count={4} />
      ) : collections.isError ? (
        <ErrorState
          title={es.catalog.errorTitle}
          description={errorMessage(collections.error)}
          onRetry={() => void collections.refetch()}
          retrying={collections.isRefetching}
          retryLabel={es.common.retry}
        />
      ) : collections.data.items.length === 0 ? (
        <p className="m-0 text-lg text-fg-muted">{t.noCollections}</p>
      ) : (
        <CollectionGrid collections={collections.data.items} />
      )}
    </section>
  );
}

export function WineryProfileView({ winery }: { winery: WineryProfile }) {
  const website = safeWebsite(winery.website);
  return (
    <article className="px-5 py-10 md:px-8 md:py-14">
      <header className="flex max-w-[46rem] flex-wrap items-center gap-5">
        <WineryMark winery={winery} className="size-20 text-4xl" />
        <div className="min-w-0">
          <p className="m-0 font-display text-sm tracking-[0.3em] text-fg-muted uppercase">
            {t.categories[winery.category]}
          </p>
          <h1 className="m-0 mt-2 font-display text-4xl leading-[1.1] font-medium text-balance md:text-5xl">
            {winery.tradeName}
          </h1>
          <p className="m-0 mt-2 text-lg text-fg-muted">{winery.region}</p>
        </div>
      </header>

      <section aria-labelledby="historia" className="mt-8 max-w-[46rem]">
        <h2 id="historia" className="m-0 mb-3 font-display text-2xl leading-tight font-medium md:text-3xl">
          {t.story}
        </h2>
        {winery.publicStory ? (
          <p className="m-0 text-lg leading-editorial whitespace-pre-line">{winery.publicStory}</p>
        ) : (
          <p className="m-0 text-lg text-fg-muted italic">{t.noStory}</p>
        )}
        {website ? (
          <p className="m-0 mt-4">
            <TextLink
              href={website}
              target="_blank"
              rel="noreferrer"
              variant="inline"
              aria-label={t.websiteLink(winery.tradeName)}
              className="inline-flex min-h-11 items-center gap-2 text-lg"
            >
              {t.website}
              <ExternalLink aria-hidden className="size-4" />
            </TextLink>
          </p>
        ) : null}
      </section>

      <WineryCollections slug={winery.slug} />
    </article>
  );
}

export function WineryScreen({ slug }: { slug: string }) {
  const winery = useWinery(slug);

  if (winery.isPending) {
    return (
      <div role="status" aria-busy="true" className="px-5 py-10 md:px-8 md:py-14">
        <span className="sr-only">{es.common.loading}</span>
        <div className="grid max-w-[46rem] gap-4" aria-hidden="true">
          <Skeleton shape="block" className="h-24" />
          <Skeleton className="w-1/3" />
          <Skeleton shape="block" className="h-32" />
        </div>
      </div>
    );
  }

  if (winery.isError) {
    const notFound = winery.error instanceof ApiError && winery.error.isNotFound;
    return (
      <div className="mx-auto w-full max-w-[46rem] px-5 py-10 md:px-8 md:py-16">
        {/* Lo que no se encontró no se indexa (con mocks ya lo dice el layout: una sola etiqueta). */}
        {env.mocks ? null : <meta name="robots" content="noindex" />}
        <h1 className="sr-only">{t.title}</h1>
        {notFound ? (
          <EmptyState
            icon={<SearchX aria-hidden />}
            title={t.notFoundTitle}
            description={t.notFoundBody}
            action={
              <Button asChild variant="secondary" size="lg">
                <Link href={routes.wineries}>{t.back}</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState
            title={t.errorTitle}
            description={errorMessage(winery.error)}
            onRetry={() => void winery.refetch()}
            retrying={winery.isRefetching}
            retryLabel={es.common.retry}
          />
        )}
      </div>
    );
  }

  return <WineryProfileView winery={winery.data} />;
}
