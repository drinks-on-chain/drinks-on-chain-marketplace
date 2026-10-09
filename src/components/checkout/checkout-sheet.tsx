"use client";

import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import {
  Alert,
  BottomSheet,
  Button,
  ErrorState,
  Field,
  IconButton,
  Input,
  Skeleton,
  Stepper,
} from "@drinks-on-chain/ui";
import { useSessionStatus } from "@/lib/account/hooks";
import { errorMessage } from "@/lib/api/errors";
import type { CollectionSummary } from "@/lib/catalog/api";
import { availableOf, editionSizeOf } from "@/lib/catalog/sale";
import { fmtBob, fmtNumber } from "@/lib/format";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";
import { useCreateOrder, useOrder, usePurchaseSettings } from "@/lib/orders/hooks";
import { maxQuantity, orderFailure, orderPhase, parseQuantity } from "@/lib/orders/status";
import { AuthPanel } from "../account/auth-forms";
import { OrderBottles, OrderEnded, PaymentPanel, PaymentReceived } from "./order-parts";

// 2C · `CheckoutSheet` ([BORRADOR §13.1]; pendiente de mover a `@drinks-on-chain/ui`): hoja modal
// con los pasos cantidad → pago → confirmación. Si no hay sesión, la cuenta (2B) se abre dentro
// del flujo y al entrar se sigue con el pedido. La pasarela es de prueba. Los NFT solo se
// enseñan después de un «Pago recibido» explícito (A-23).

const t = es.checkout;

type Step = "quantity" | "account" | "order";

/** ¿La persona ya hizo algo en la hoja desde que se abrió? */
const InteractedContext = createContext(false);

/**
 * Título de cada paso: recibe el foco al cambiar de paso, para que se anuncie. Al abrir la hoja
 * no: el foco inicial es del diálogo, que así sabe a qué botón devolverlo al cerrarse.
 */
function StepHeading({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const interacted = useContext(InteractedContext);
  useEffect(() => {
    if (interacted) ref.current?.focus();
    // Solo al montarse el paso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <h3 ref={ref} tabIndex={-1} className="m-0 font-ui text-lg font-semibold outline-none">
      {children}
    </h3>
  );
}

function QuantityStep({
  collection,
  value,
  onChange,
  maxPerOrder,
  reservationMinutes,
  error,
  formError,
  pending,
  onSubmit,
}: {
  collection: CollectionSummary;
  value: string;
  onChange: (value: string) => void;
  maxPerOrder: number | null;
  reservationMinutes: number | null;
  error: string | null;
  formError: string | null;
  pending: boolean;
  onSubmit: (quantity: number | null) => void;
}) {
  const available = availableOf(collection);
  const max = maxQuantity(available, maxPerOrder);
  const quantity = parseQuantity(value, max);
  const current = quantity ?? (/^\d+$/.test(value.trim()) ? Number(value) : 0);
  const price = collection.price?.amountMinor ?? 0;
  const step = (delta: number) => onChange(String(Math.min(Math.max(current + delta, 1), Math.max(max, 1))));
  const help = [
    t.quantity.available(fmtNumber(available)),
    maxPerOrder === null ? null : t.quantity.maxKnown(fmtNumber(maxPerOrder)),
  ]
    .filter(Boolean)
    .join(" ");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(quantity);
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <StepHeading>{t.quantity.title}</StepHeading>
      {formError ? <Alert tone="danger">{formError}</Alert> : null}
      <Field label={t.quantity.label} help={help} error={error ? <span role="alert">{error}</span> : undefined}>
        <Input
          name="quantity"
          numeric
          inputMode="numeric"
          autoComplete="off"
          size="lg"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          wrapperClassName="max-w-56"
          className="text-center"
          prefix={
            <IconButton
              type="button"
              label={t.quantity.decrease}
              variant="ghost"
              size="lg"
              onClick={() => step(-1)}
              disabled={current <= 1}
            >
              <Minus aria-hidden />
            </IconButton>
          }
          suffix={
            <IconButton
              type="button"
              label={t.quantity.increase}
              variant="ghost"
              size="lg"
              onClick={() => step(1)}
              disabled={current >= max}
            >
              <Plus aria-hidden />
            </IconButton>
          }
        />
      </Field>
      <dl className="m-0 grid gap-2 rounded-lg border border-border bg-bg-raised p-4 text-md">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-fg-muted">{t.quantity.unit}</dt>
          <dd className="tabular m-0">{fmtBob(price)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2 font-semibold">
          <dt>{t.quantity.total}</dt>
          <dd className="tabular m-0" aria-live="polite">
            {quantity === null ? "—" : fmtBob(price * quantity)}
          </dd>
        </div>
      </dl>
      <p className="m-0 text-sm text-fg-muted">
        {reservationMinutes === null ? t.quantity.reserveNote : t.quantity.reserveNoteMinutes(reservationMinutes)}
      </p>
      <Button type="submit" size="lg" block loading={pending}>
        {t.quantity.continue}
      </Button>
    </form>
  );
}

function OrderStep({
  orderId,
  editionSize,
  onRetry,
  onClose,
}: {
  orderId: string;
  editionSize: number;
  onRetry: () => void;
  onClose: () => void;
}) {
  const order = useOrder(orderId);
  // «Pago recibido» primero; las botellas, cuando la persona las pide (A-23).
  const [revealed, setRevealed] = useState(false);

  if (order.isPending) {
    return (
      <div role="status" aria-busy="true" className="grid gap-3">
        <span className="sr-only">{es.common.loading}</span>
        <Skeleton shape="block" className="h-20" />
        <Skeleton shape="block" className="h-32" />
      </div>
    );
  }
  if (order.isError) {
    return (
      <ErrorState
        title={t.errors.orderErrorTitle}
        description={errorMessage(order.error)}
        onRetry={() => void order.refetch()}
        retrying={order.isRefetching}
        retryLabel={es.common.retry}
      />
    );
  }

  const phase = orderPhase(order.data);
  if (phase === "awaiting") {
    return (
      <div className="grid gap-4">
        <StepHeading>{t.payment.title}</StepHeading>
        <PaymentPanel order={order.data} />
      </div>
    );
  }
  if (phase === "paid") {
    return (
      <div className="grid gap-4">
        <StepHeading>{t.received.title}</StepHeading>
        <PaymentReceived order={order.data} />
        {revealed ? (
          <OrderBottles order={order.data} editionSize={editionSize} />
        ) : (
          <Button size="lg" block onClick={() => setRevealed(true)}>
            {t.received.show}
          </Button>
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="lg">
            <Link href={routes.order(order.data.id)}>{t.received.order}</Link>
          </Button>
          <Button variant="tertiary" size="lg" onClick={onClose}>
            {t.close}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="grid gap-4">
      <StepHeading>{phase === "expired" ? t.expired.title : t.failed.title}</StepHeading>
      <OrderEnded order={order.data} onRetry={onRetry} />
    </div>
  );
}

export type CheckoutSheetProps = {
  collection: CollectionSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CheckoutSheet({ collection, open, onOpenChange }: CheckoutSheetProps) {
  const status = useSessionStatus();
  const createOrder = useCreateOrder();
  const [step, setStep] = useState<Step>("quantity");
  const [quantityText, setQuantityText] = useState("1");
  // El máximo por compra llega de la configuración pública; si el servidor rechaza un pedido con
  // otro máximo (cambió, o la configuración no respondió), manda el que diga el rechazo.
  const settings = usePurchaseSettings(open);
  const [learnedMax, setLearnedMax] = useState<number | null>(null);
  const maxPerOrder = learnedMax ?? settings.data?.maxBottlesPerOrder ?? null;
  const reservationMinutes = settings.data?.reservationMinutes ?? null;
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [interacted, setInteracted] = useState(false);
  const order = useOrder(step === "order" ? orderId : null);
  // Una clave por intento de compra: un doble envío o un reintento de red no crean dos pedidos.
  const attemptKey = useRef<string>(crypto.randomUUID());

  const available = availableOf(collection);
  const max = maxQuantity(available, maxPerOrder);

  function changeQuantity(value: string) {
    setQuantityText(value);
    setFieldError(null);
    setFormError(null);
    attemptKey.current = crypto.randomUUID();
  }

  function placeOrder(quantity: number) {
    createOrder.mutate(
      { collectionId: collection.id, quantity, idempotencyKey: attemptKey.current },
      {
        onSuccess: (created) => {
          setOrderId(created.id);
          setStep("order");
        },
        onError: (error) => {
          const failure = orderFailure(error);
          if (failure.maxPerOrder !== undefined) setLearnedMax(failure.maxPerOrder);
          setFieldError(failure.field ? failure.message : null);
          setFormError(failure.field ? null : failure.message);
          setStep("quantity");
          attemptKey.current = crypto.randomUUID();
        },
      },
    );
  }

  function submitQuantity(quantity: number | null) {
    if (quantity === null) return setFieldError(t.quantity.invalid(fmtNumber(Math.max(max, 1))));
    if (status !== "authenticated") return setStep("account");
    placeOrder(quantity);
  }

  function startOver() {
    setOrderId(null);
    setStep("quantity");
    setFieldError(null);
    setFormError(null);
    attemptKey.current = crypto.randomUUID();
  }

  function change(next: boolean) {
    // Al cerrar con el pedido ya resuelto, la próxima vez se empieza de cero. Uno que aún
    // espera el pago se conserva: se puede seguir aquí o desde «Mis pedidos».
    if (!next && order.data && orderPhase(order.data) !== "awaiting") startOver();
    if (!next && step === "account") setStep("quantity");
    if (!next) setInteracted(false);
    onOpenChange(next);
  }

  const phase = step === "order" && order.data ? orderPhase(order.data) : null;
  const current = step !== "order" ? 0 : phase === null || phase === "awaiting" ? 1 : 2;

  return (
    <BottomSheet
      open={open}
      onOpenChange={change}
      title={t.title(collection.name)}
      closeLabel={t.close}
      maxHeight="tall"
      bodyClassName="font-ui"
    >
      <InteractedContext.Provider value={interacted}>
        <div
          className="grid gap-5"
          onPointerDownCapture={() => setInteracted(true)}
          onKeyDownCapture={() => setInteracted(true)}
        >
          <Stepper
            aria-label={t.stepsLabel}
            current={current}
            completedLabel={t.stepDone}
            steps={[{ label: t.steps.quantity }, { label: t.steps.payment }, { label: t.steps.confirmation }]}
          />

          {step === "quantity" ? (
            <QuantityStep
              collection={collection}
              value={quantityText}
              onChange={changeQuantity}
              maxPerOrder={maxPerOrder}
              reservationMinutes={reservationMinutes}
              error={fieldError}
              formError={formError}
              pending={createOrder.isPending || status === "unknown"}
              onSubmit={submitQuantity}
            />
          ) : null}

          {step === "account" ? (
            <div className="grid gap-4">
              <StepHeading>{t.account.title}</StepHeading>
              <p className="m-0 text-md text-fg-muted">{t.account.body}</p>
              <AuthPanel
                onAuthenticated={() => {
                  // Con la sesión abierta se sigue con el pedido que ya se había pedido.
                  const quantity = parseQuantity(quantityText, max);
                  setStep("quantity");
                  if (quantity !== null) placeOrder(quantity);
                }}
              />
              <Button variant="tertiary" size="lg" onClick={() => setStep("quantity")} className="justify-self-start">
                {t.account.back}
              </Button>
            </div>
          ) : null}

          {step === "order" && orderId ? (
            <OrderStep
              orderId={orderId}
              editionSize={editionSizeOf(collection)}
              onRetry={startOver}
              onClose={() => change(false)}
            />
          ) : null}
        </div>
      </InteractedContext.Provider>
    </BottomSheet>
  );
}

/** Botón «Comprar» de la ficha, con su hoja. El foco vuelve a él al cerrarla. */
export function BuyButton({ collection }: { collection: CollectionSummary }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="lg" block className="mt-2" onClick={() => setOpen(true)}>
        {t.buy}
      </Button>
      <CheckoutSheet collection={collection} open={open} onOpenChange={setOpen} />
    </>
  );
}
