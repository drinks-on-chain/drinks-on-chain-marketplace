"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { Badge, EmptyState, ErrorState, Skeleton, cn, focusRing } from "@drinks-on-chain/ui";
import { errorMessage } from "@/lib/api/errors";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";
import type { WineryProfile } from "@/lib/wineries/api";
import { useWineries } from "@/lib/wineries/hooks";
import { DataImage } from "../store/data-image";

// Directorio de bodegas activas (`GET /v1/public/wineries`, real en el backend).

const t = es.wineries;

/** Logotipo de la bodega o, si no hay, su inicial en un sello. */
export function WineryMark({ winery, className }: { winery: WineryProfile; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-14 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-bg-sunken font-display text-2xl text-accent-text",
        className,
      )}
    >
      <DataImage
        src={winery.logoUrl}
        className="size-full object-contain"
        fallback={winery.tradeName.replace(/^(Bodega|Destilería)\s+/i, "").charAt(0)}
      />
    </span>
  );
}

function WineryCard({ winery }: { winery: WineryProfile }) {
  return (
    <article className="group relative flex gap-4 rounded-lg border border-border bg-bg-raised p-5">
      <WineryMark winery={winery} />
      <div className="min-w-0">
        <h2 className="m-0 font-display text-2xl leading-tight font-medium">
          <Link
            href={routes.winery(winery.slug)}
            className={cn(
              "rounded-sm text-fg no-underline after:absolute after:inset-0 after:content-[''] group-hover:underline",
              focusRing,
            )}
          >
            {winery.tradeName}
          </Link>
        </h2>
        <p className="m-0 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-md text-fg-muted">
          <Badge dot={false}>{t.categories[winery.category]}</Badge>
          {winery.region}
        </p>
        {winery.publicStory ? <p className="m-0 mt-2 line-clamp-3 text-md">{winery.publicStory}</p> : null}
      </div>
    </article>
  );
}

export function WineriesScreen() {
  const wineries = useWineries();
  return (
    <div className="px-5 py-10 md:px-8 md:py-14">
      <header className="mb-8 max-w-[46rem]">
        <h1 className="m-0 font-display text-4xl leading-tight font-medium md:text-5xl">{t.title}</h1>
        <p className="mt-3 mb-0 text-lg leading-editorial text-fg-muted">{t.lead}</p>
      </header>

      {wineries.isPending ? (
        <div role="status" aria-busy="true">
          <span className="sr-only">{es.common.loading}</span>
          <div className="grid gap-4 md:grid-cols-2" aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} shape="block" className="h-32 rounded-lg" />
            ))}
          </div>
        </div>
      ) : wineries.isError ? (
        <ErrorState
          title={t.errorTitle}
          description={errorMessage(wineries.error)}
          onRetry={() => void wineries.refetch()}
          retrying={wineries.isRefetching}
          retryLabel={es.common.retry}
        />
      ) : wineries.data.items.length === 0 ? (
        <EmptyState icon={<Building2 aria-hidden />} title={t.emptyTitle} description={t.emptyBody} />
      ) : (
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
          {wineries.data.items.map((winery) => (
            <li key={winery.slug} className="grid">
              <WineryCard winery={winery} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
