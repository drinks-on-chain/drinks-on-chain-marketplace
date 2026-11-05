"use client";

import { useState } from "react";
import { CircleCheck, Hourglass } from "lucide-react";
import { Alert, Badge, Button, Spinner, TxStatusBadge } from "@drinks-on-chain/ui";
import { errorMessage } from "@/lib/api/errors";
import { fmtBob, fmtDateTime, fmtNumber, fmtTime } from "@/lib/format";
import { es } from "@/lib/i18n/es";
import type { Order, PaymentOutcome } from "@/lib/orders/api";
import { useSimulatePayment } from "@/lib/orders/hooks";
import { ORDER_TONE, orderPhase, visibleTokens } from "@/lib/orders/status";

// 2C · Piezas de un pedido ([BORRADOR §13.1]), comunes a la hoja de compra y a la página del
// pedido. Familia operativa. `OrderStatusBadge` es el `OrderStatus` del sistema de diseño
// (pendiente de mover a `@drinks-on-chain/ui`).
//
// Regla A-23: los NFT de un pedido solo aparecen **después** de un «Pago recibido» explícito.

const t = es.checkout;

export function OrderStatusBadge({ order, size }: { order: Pick<Order, "status">; size?: "md" | "lg" }) {
  const phase = orderPhase(order);
  return (
    <Badge tone={ORDER_TONE[phase]} size={size}>
      {es.orders.statuses[phase]}
    </Badge>
  );
}

/** Qué se compra y cuánto cuesta, con el formato único de bolivianos. */
export function OrderSummary({ order }: { order: Order }) {
  return (
    <dl className="m-0 grid gap-2 rounded-lg border border-border bg-bg-raised p-4 text-md">
      <div className="flex items-baseline justify-between gap-4">
        <dt>{t.payment.summary(fmtNumber(order.quantity), order.collection.name)}</dt>
        <dd className="tabular m-0 text-fg-muted">{fmtBob(order.unitPrice.amountMinor)}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2 font-semibold">
        <dt>{t.quantity.total}</dt>
        <dd className="tabular m-0">{fmtBob(order.total.amountMinor)}</dd>
      </div>
    </dl>
  );
}

/**
 * Pedido esperando el pago: hasta cuándo se guardan las botellas y la **pasarela de prueba**
 * (aprobar, rechazar o demorar). No mueve dinero y lo dice.
 */
export function PaymentPanel({ order }: { order: Order }) {
  const simulate = useSimulatePayment();
  const [delayed, setDelayed] = useState(false);
  const run = (outcome: PaymentOutcome) =>
    simulate.mutate({ paymentId: order.payment.id, outcome }, { onSuccess: () => setDelayed(outcome === "DELAY") });
  const busy = (outcome: PaymentOutcome) => simulate.isPending && simulate.variables?.outcome === outcome;

  return (
    <div className="grid gap-4">
      <OrderSummary order={order} />
      <div role="status" className="grid gap-1 text-sm text-fg-muted">
        <p className="m-0 flex items-center gap-2">
          <Spinner decorative />
          {t.payment.waiting}
        </p>
        {order.reservedUntil ? <p className="m-0">{t.payment.reservedUntil(fmtTime(order.reservedUntil))}</p> : null}
      </div>

      <section
        aria-labelledby="pasarela"
        className="grid gap-3 rounded-lg border border-dashed border-border-strong p-4"
      >
        <h3 id="pasarela" className="m-0 font-ui text-md font-semibold">
          {t.payment.gatewayTitle}
        </h3>
        <p className="m-0 text-sm text-fg-muted">{t.payment.gatewayBody}</p>
        <div className="grid gap-2">
          <Button
            size="lg"
            block
            onClick={() => run("APPROVE")}
            loading={busy("APPROVE")}
            disabled={simulate.isPending}
          >
            {t.payment.approve}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            block
            onClick={() => run("REJECT")}
            loading={busy("REJECT")}
            disabled={simulate.isPending}
          >
            {t.payment.reject}
          </Button>
          <Button
            variant="tertiary"
            size="lg"
            block
            onClick={() => run("DELAY")}
            loading={busy("DELAY")}
            disabled={simulate.isPending}
          >
            {t.payment.delay}
          </Button>
        </div>
        {delayed ? (
          <Alert tone="info" icon={<Hourglass aria-hidden />}>
            {t.payment.delayed}
          </Alert>
        ) : null}
        {simulate.isError ? <Alert tone="danger">{errorMessage(simulate.error)}</Alert> : null}
      </section>
    </div>
  );
}

/** «Pago recibido», explícito y antes de cualquier NFT (A-23). */
export function PaymentReceived({ order }: { order: Order }) {
  return (
    <Alert tone="success" icon={<CircleCheck aria-hidden />} title={t.received.title}>
      <p className="m-0">{t.received.body(fmtBob(order.total.amountMinor))}</p>
      {order.payment.paidAt ? (
        <p className="m-0 mt-1 text-sm">{t.received.paidAt(fmtDateTime(order.payment.paidAt))}</p>
      ) : null}
    </Alert>
  );
}

/**
 * Los NFT del pedido, uno por botella: «Botella N de M». Solo pinta algo con el pago recibido.
 * `editionSize` es el tamaño de la colección (el pedido no lo trae); sin él, «Botella n.º N».
 */
export function OrderBottles({ order, editionSize }: { order: Order; editionSize: number | null }) {
  const tokens = visibleTokens(order);
  if (tokens.length === 0) return null;
  const pending = tokens.some((token) => token.transfer === null);
  return (
    <section aria-labelledby="botellas" className="grid gap-2">
      <h3 id="botellas" className="m-0 font-ui text-md font-semibold">
        {t.bottles.title}
      </h3>
      <ul aria-labelledby="botellas" className="m-0 grid list-none gap-0 p-0">
        {tokens.map((token) => (
          <li
            key={token.tokenId}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border py-3"
          >
            <div>
              <p className="m-0 text-md font-medium">
                {editionSize
                  ? t.bottles.bottle(fmtNumber(token.bottleNumber), fmtNumber(editionSize))
                  : t.bottles.bottleNoTotal(fmtNumber(token.bottleNumber))}
              </p>
              <p className="tabular m-0 text-sm text-fg-muted">{t.bottles.token(String(token.tokenId))}</p>
            </div>
            {token.transfer ? (
              <TxStatusBadge
                status={token.transfer.status}
                explorerUrl={token.transfer.explorerUrl}
                lastError={token.transfer.lastError}
                attempts={token.transfer.attempts}
                aria-label={t.bottles.delivery}
              />
            ) : (
              <Badge tone="info">{t.bottles.deliveryPending}</Badge>
            )}
          </li>
        ))}
      </ul>
      {pending ? <p className="m-0 text-sm text-fg-muted">{t.bottles.deliveryNote}</p> : null}
    </section>
  );
}

/** Pago rechazado o reserva caducada: qué pasó (sin cargo) y cómo volver a intentarlo. */
export function OrderEnded({ order, onRetry }: { order: Order; onRetry?: () => void }) {
  const copy = orderPhase(order) === "expired" ? t.expired : t.failed;
  return (
    <div className="grid justify-items-start gap-4">
      <Alert tone="warning" title={copy.title}>
        {copy.body}
      </Alert>
      {onRetry ? (
        <Button size="lg" onClick={onRetry}>
          {copy.retry}
        </Button>
      ) : null}
    </div>
  );
}
