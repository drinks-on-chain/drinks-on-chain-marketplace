"use client";

import Link from "next/link";
import { ReceiptText, SearchX, WifiOff } from "lucide-react";
import { Button, EmptyState, ErrorState, Pagination, Skeleton, TextLink, cn, focusRing } from "@drinks-on-chain/ui";
import { ApiError, NetworkError, errorMessage } from "@/lib/api/errors";
import { useCollection } from "@/lib/catalog/hooks";
import { editionSizeOf } from "@/lib/catalog/sale";
import { fmtBob, fmtDate } from "@/lib/format";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";
import type { Order } from "@/lib/orders/api";
import { ORDERS_PAGE_SIZE, useOrder, useOrders } from "@/lib/orders/hooks";
import { orderPhase } from "@/lib/orders/status";
import { useUrlParams } from "@/lib/use-url-params";
import { AccountGate } from "../account/account-screen";
import { AccountColumn } from "../account/form-parts";
import { OrderBottles, OrderEnded, OrderStatusBadge, OrderSummary, PaymentPanel, PaymentReceived } from "./order-parts";

// 2C · Historial de pedidos y página de un pedido ([BORRADOR §13.1]). Solo con sesión
// (`AccountGate`); familia operativa.

const t = es.orders;

function ListSkeleton() {
  return (
    <div role="status" aria-busy="true" className="grid gap-3">
      <span className="sr-only">{t.loading}</span>
      <Skeleton shape="block" className="h-24" />
      <Skeleton shape="block" className="h-24" />
      <Skeleton shape="block" className="h-24" />
    </div>
  );
}

/** Sin conexión se dice aparte de un fallo del servidor; los dos, con reintento. */
function LoadError({ error, onRetry, retrying }: { error: unknown; onRetry: () => void; retrying: boolean }) {
  if (error instanceof NetworkError) {
    return (
      <EmptyState
        role="alert"
        icon={<WifiOff aria-hidden />}
        title={t.offlineTitle}
        description={t.offlineBody}
        action={
          <Button variant="secondary" size="lg" onClick={onRetry} loading={retrying}>
            {es.common.retry}
          </Button>
        }
      />
    );
  }
  return (
    <ErrorState
      title={t.errorTitle}
      description={errorMessage(error)}
      onRetry={onRetry}
      retrying={retrying}
      retryLabel={es.common.retry}
    />
  );
}

export function OrderRow({ order }: { order: Order }) {
  return (
    <article className="relative grid gap-2 rounded-lg border border-border bg-bg-raised p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <h2 className="m-0 font-ui text-lg font-semibold">
          <Link
            href={routes.order(order.id)}
            aria-label={t.view(order.collection.name)}
            className={cn("rounded-sm text-fg no-underline after:absolute after:inset-0 after:content-['']", focusRing)}
          >
            {order.collection.name}
          </Link>
        </h2>
        <OrderStatusBadge order={order} />
      </div>
      <p className="m-0 text-sm text-fg-muted">
        {order.collection.winery.tradeName} · {t.orderedOn(fmtDate(order.createdAt))}
      </p>
      <p className="m-0 flex items-baseline justify-between gap-4 text-md">
        <span>{t.bottles(order.quantity)}</span>
        <span className="tabular font-semibold">{fmtBob(order.total.amountMinor)}</span>
      </p>
    </article>
  );
}

function OrdersList() {
  const { params, set } = useUrlParams();
  const page = Math.max(1, Number.parseInt(params.get("pagina") ?? "1", 10) || 1);
  const offset = (page - 1) * ORDERS_PAGE_SIZE;
  const orders = useOrders(offset);

  if (orders.isPending) return <ListSkeleton />;
  if (orders.isError) {
    return <LoadError error={orders.error} onRetry={() => void orders.refetch()} retrying={orders.isRefetching} />;
  }
  if (orders.data.total === 0) {
    return (
      <EmptyState
        icon={<ReceiptText aria-hidden />}
        title={t.emptyTitle}
        description={t.emptyBody}
        action={
          <Button asChild size="lg">
            <Link href={routes.catalog}>{t.toCatalog}</Link>
          </Button>
        }
      />
    );
  }
  return (
    <div className="grid gap-4">
      <ul className="m-0 grid list-none gap-3 p-0">
        {orders.data.items.map((order) => (
          <li key={order.id}>
            <OrderRow order={order} />
          </li>
        ))}
      </ul>
      {orders.data.total > ORDERS_PAGE_SIZE ? (
        <Pagination
          total={orders.data.total}
          limit={ORDERS_PAGE_SIZE}
          offset={offset}
          onOffsetChange={(next) => set({ pagina: next > 0 ? String(next / ORDERS_PAGE_SIZE + 1) : null })}
        />
      ) : null}
    </div>
  );
}

/** `/cuenta/pedidos`. */
export function OrdersScreen() {
  return (
    <AccountGate title={t.title}>
      <AccountColumn title={t.title} lead={t.lead} className="max-w-[40rem]">
        <OrdersList />
        <p className="m-0 mt-6 text-sm">
          <TextLink asChild variant="inline" className="inline-flex min-h-11 items-center">
            <Link href={routes.account}>{t.account}</Link>
          </TextLink>
        </p>
      </AccountColumn>
    </AccountGate>
  );
}

/** El pedido, según su estado. Aquí las botellas van bajo el «Pago recibido», ya a la vista. */
export function OrderView({ order, editionSize }: { order: Order; editionSize: number | null }) {
  const phase = orderPhase(order);
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="m-0 text-sm text-fg-muted">
          {order.collection.winery.tradeName} · {t.orderedOn(fmtDate(order.createdAt))}
        </p>
        <OrderStatusBadge order={order} size="lg" />
      </div>
      {phase === "awaiting" ? (
        <PaymentPanel order={order} />
      ) : (
        <>
          <OrderSummary order={order} />
          {phase === "paid" ? (
            <>
              <PaymentReceived order={order} />
              <OrderBottles order={order} editionSize={editionSize} />
            </>
          ) : (
            <OrderEnded order={order} />
          )}
        </>
      )}
      <TextLink asChild variant="inline" className="inline-flex min-h-11 items-center justify-self-start text-sm">
        <Link href={routes.collection(order.collection.slug)}>{t.collection}</Link>
      </TextLink>
    </div>
  );
}

function OrderDetail({ id }: { id: string }) {
  const order = useOrder(id);
  // El pedido no trae el tamaño de la colección («Botella N de M»): sale del catálogo.
  const collection = useCollection(order.data?.collection.slug ?? "", { enabled: Boolean(order.data) });

  if (order.isPending) return <ListSkeleton />;
  if (order.isError) {
    if (order.error instanceof ApiError && order.error.isNotFound) {
      return <EmptyState icon={<SearchX aria-hidden />} title={t.notFoundTitle} description={t.notFoundBody} />;
    }
    return <LoadError error={order.error} onRetry={() => void order.refetch()} retrying={order.isRefetching} />;
  }
  return <OrderView order={order.data} editionSize={collection.data ? editionSizeOf(collection.data) : null} />;
}

/** `/cuenta/pedidos/{id}`. */
export function OrderScreen({ id }: { id: string }) {
  const order = useOrder(id);
  const title = order.data?.collection.name ?? t.detailTitle;
  return (
    <AccountGate title={t.detailTitle}>
      <AccountColumn title={title} className="max-w-[40rem]">
        <OrderDetail id={id} />
        <p className="m-0 mt-6 text-sm">
          <TextLink asChild variant="inline" className="inline-flex min-h-11 items-center">
            <Link href={routes.orders}>{t.back}</Link>
          </TextLink>
        </p>
      </AccountColumn>
    </AccountGate>
  );
}
