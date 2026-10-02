"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { COLLECTION_STATUSES, LOT_PRODUCT_TYPES } from "@drinks-on-chain/mocks";
import { Search, Wine } from "lucide-react";
import { Button, EmptyState, ErrorState, Field, Input, Pagination, Pill, PillGroup } from "@drinks-on-chain/ui";
import { errorMessage } from "@/lib/api/errors";
import { isCatalogUnavailable, type CollectionFilters } from "@/lib/catalog/api";
import {
  CATALOG_PAGE_SIZE,
  CATALOG_PARAMS,
  filtersFromParams,
  hasFilters,
  pageFromParams,
  paramsFromFilters,
} from "@/lib/catalog/filters";
import { useCollections } from "@/lib/catalog/hooks";
import { env } from "@/lib/env";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";
import { useUrlParams } from "@/lib/use-url-params";
import { useWineries } from "@/lib/wineries/hooks";
import { NativeSelect } from "../store/native-select";
import { CollectionGrid, CollectionGridSkeleton } from "./collection-grid";

// 2A · Catálogo sin cuenta.
// [BORRADOR §17.1] La lista y sus filtros (tipo, bodega, estado, búsqueda) son los del borrador
// del catálogo: pueden cambiar. Con un backend que aún no lo publica, la pantalla dice
// "próximamente". Sin compra ni cuenta en esta ola.

const t = es.catalog;
// Objetivo táctil de 44 px (los `Pill` del paquete miden 32).
const PILL = "h-11 px-4";

/** "Próximamente": el catálogo todavía no existe en este entorno. */
export function CatalogSoon({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  return (
    <EmptyState
      headingLevel={headingLevel}
      icon={<Wine aria-hidden />}
      title={t.soonTitle}
      description={t.soonBody}
      action={
        <Button asChild size="lg">
          <Link href={routes.verify}>{t.verify}</Link>
        </Button>
      }
    />
  );
}

export function CatalogScreen() {
  const { params, set, clear } = useUrlParams();
  const filters = filtersFromParams(params);
  const { page, offset } = pageFromParams(params);
  const collections = useCollections(filters, { limit: CATALOG_PAGE_SIZE, offset });
  const wineries = useWineries();

  // El texto de búsqueda se aplica al enviar; el resto de filtros, al pulsarlos.
  const [search, setSearch] = useState(filters.q ?? "");
  const apply = (next: CollectionFilters) => set({ ...paramsFromFilters(next), [CATALOG_PARAMS.page]: null });
  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    apply({ ...filters, q: search.trim() || undefined });
  };
  const clearAll = () => {
    setSearch("");
    clear();
  };

  const unavailable = collections.isError && isCatalogUnavailable(collections.error);
  const data = collections.data;
  const filtered = hasFilters(filters);

  return (
    <div className="px-5 py-10 md:px-8 md:py-14">
      <header className="mb-8 max-w-[46rem]">
        <h1 className="m-0 font-display text-4xl leading-tight font-medium md:text-5xl">{t.title}</h1>
        <p className="mt-3 mb-0 text-lg leading-editorial text-fg-muted">{t.lead}</p>
        {env.mocks && !unavailable ? (
          <p className="mt-3 mb-0 font-ui text-sm text-fg-subtle">
            {es.common.demoData} · {t.draftNote}
          </p>
        ) : null}
      </header>

      {unavailable ? (
        <CatalogSoon />
      ) : (
        <>
          <section aria-label={t.filters} className="mb-8 grid gap-4 font-ui">
            <form onSubmit={onSearch} role="search" className="flex items-end gap-2 md:max-w-md">
              <Field label={t.search} className="min-w-0 flex-1">
                <Input
                  type="search"
                  name="q"
                  size="lg"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t.searchPlaceholder}
                  enterKeyHint="search"
                />
              </Field>
              <Button type="submit" variant="secondary" size="xl" iconStart={<Search aria-hidden />}>
                {t.searchSubmit}
              </Button>
            </form>

            <div className="grid gap-4 md:flex md:flex-wrap md:items-end md:gap-x-8">
              <div className="grid gap-1">
                <span id="filtro-tipo" className="text-sm font-medium">
                  {t.type}
                </span>
                <PillGroup aria-labelledby="filtro-tipo">
                  <Pill
                    className={PILL}
                    pressed={!filters.productType}
                    onPressedChange={() => apply({ ...filters, productType: undefined })}
                  >
                    {t.all}
                  </Pill>
                  {LOT_PRODUCT_TYPES.map((type) => (
                    <Pill
                      key={type}
                      className={PILL}
                      pressed={filters.productType === type}
                      onPressedChange={(pressed) => apply({ ...filters, productType: pressed ? type : undefined })}
                    >
                      {es.productTypes[type]}
                    </Pill>
                  ))}
                </PillGroup>
              </div>

              <div className="grid gap-1">
                <span id="filtro-estado" className="text-sm font-medium">
                  {t.status}
                </span>
                <PillGroup aria-labelledby="filtro-estado">
                  <Pill
                    className={PILL}
                    pressed={!filters.status}
                    onPressedChange={() => apply({ ...filters, status: undefined })}
                  >
                    {t.all}
                  </Pill>
                  {COLLECTION_STATUSES.map((status) => (
                    <Pill
                      key={status}
                      className={PILL}
                      pressed={filters.status === status}
                      onPressedChange={(pressed) => apply({ ...filters, status: pressed ? status : undefined })}
                    >
                      {t.statuses[status]}
                    </Pill>
                  ))}
                </PillGroup>
              </div>

              <Field label={t.winery} className="md:w-72">
                <NativeSelect
                  value={filters.winery ?? ""}
                  onChange={(event) => apply({ ...filters, winery: event.target.value || undefined })}
                  options={[
                    { value: "", label: t.allWineries },
                    ...(wineries.data?.items ?? []).map((w) => ({ value: w.slug, label: w.tradeName })),
                    // Una bodega de la URL que el directorio no trae (aún cargando o inactiva) sigue elegida.
                    ...(filters.winery && !wineries.data?.items.some((w) => w.slug === filters.winery)
                      ? [{ value: filters.winery, label: filters.winery }]
                      : []),
                  ]}
                />
              </Field>
            </div>
          </section>

          <div className="mb-5 flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2 font-ui text-sm">
            <p role="status" className="m-0 text-fg-muted">
              {data ? t.results(data.total) : null}
            </p>
            {filtered ? (
              <Button variant="tertiary" size="lg" onClick={clearAll}>
                {t.clear}
              </Button>
            ) : null}
          </div>

          {collections.isPending ? (
            <CollectionGridSkeleton count={8} />
          ) : collections.isError ? (
            <ErrorState
              title={t.errorTitle}
              description={errorMessage(collections.error)}
              onRetry={() => void collections.refetch()}
              retrying={collections.isRefetching}
              retryLabel={es.common.retry}
            />
          ) : data && data.items.length > 0 ? (
            <>
              <CollectionGrid collections={data.items} headingLevel={2} />
              {data.total > CATALOG_PAGE_SIZE ? (
                <Pagination
                  className="mt-10 font-ui"
                  total={data.total}
                  limit={CATALOG_PAGE_SIZE}
                  offset={(page - 1) * CATALOG_PAGE_SIZE}
                  onOffsetChange={(next) => {
                    const nextPage = Math.floor(next / CATALOG_PAGE_SIZE) + 1;
                    set({ [CATALOG_PARAMS.page]: nextPage > 1 ? String(nextPage) : null });
                    window.scrollTo({ top: 0 });
                  }}
                  showRange
                />
              ) : null}
            </>
          ) : filtered ? (
            <EmptyState
              title={t.noMatchTitle}
              description={t.noMatchBody}
              action={
                <Button variant="secondary" size="lg" onClick={clearAll}>
                  {t.clear}
                </Button>
              }
            />
          ) : (
            <EmptyState icon={<Wine aria-hidden />} title={t.emptyTitle} description={t.emptyBody} />
          )}
        </>
      )}
    </div>
  );
}
