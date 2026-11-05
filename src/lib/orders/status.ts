import { ApiError, errorMessage } from "@/lib/api/errors";
import { fmtNumber } from "@/lib/format";
import { es } from "@/lib/i18n/es";
import { ORDER_ERROR_CODES, expectedQuantity, type Order } from "./api";

// [BORRADOR §13.1] Lo que las pantallas de la compra deducen de un pedido. Puro y con pruebas.

/**
 * En qué punto está un pedido, para la pantalla:
 * - `awaiting`: apartado, esperando el pago (`CREATED`, `AWAITING_PAYMENT`).
 * - `paid`: pago recibido (`PAID` y los estados posteriores de la entrega, que llegan en la Ola 4).
 * - `failed`: el pago no se completó. `expired`: la reserva caducó sin pago.
 */
export type OrderPhase = "awaiting" | "paid" | "failed" | "expired";

export function orderPhase(order: Pick<Order, "status">): OrderPhase {
  switch (order.status) {
    case "CREATED":
    case "AWAITING_PAYMENT":
      return "awaiting";
    case "PAYMENT_FAILED":
      return "failed";
    case "EXPIRED":
      return "expired";
    default:
      return "paid";
  }
}

/** ¿Hay que seguir consultándolo? Solo mientras espera el pago. */
export const isOrderOpen = (order: Pick<Order, "status">) => orderPhase(order) === "awaiting";

/**
 * Los NFT de un pedido **solo** se enseñan con el pago recibido (A-23): aunque una respuesta los
 * trajera antes, no se pintan.
 */
export const visibleTokens = (order: Order): Order["tokens"] => (orderPhase(order) === "paid" ? order.tokens : []);

export const ORDER_TONE = {
  awaiting: "info",
  paid: "success",
  failed: "danger",
  expired: "neutral",
} as const satisfies Record<OrderPhase, string>;

/** Cuántas botellas deja pedir el formulario: lo disponible y, si ya se conoce, el máximo por compra. */
export function maxQuantity(available: number, maxPerOrder: number | null): number {
  const limit = maxPerOrder === null ? available : Math.min(available, maxPerOrder);
  return Math.max(0, Math.floor(limit));
}

/** Lee la cantidad escrita: un entero entre 1 y `max`; `null` si no lo es. */
export function parseQuantity(input: string, max: number): number | null {
  const text = input.trim();
  if (!/^\d+$/.test(text)) return null;
  const quantity = Number(text);
  return quantity >= 1 && quantity <= max ? quantity : null;
}

export type OrderFailure = {
  /** Mensaje para el campo de la cantidad (o general, si `field` es `false`). */
  message: string;
  field: boolean;
  /** Máximo por compra que reveló el servidor (`MKT_MAX_PER_ORDER`). */
  maxPerOrder?: number;
  /** Botellas que quedan según el servidor (`MKT_NOT_ENOUGH_STOCK`). */
  available?: number;
};

/** Traduce el rechazo de un pedido a lo que la persona puede hacer. */
export function orderFailure(error: unknown): OrderFailure {
  const t = es.checkout.errors;
  if (error instanceof ApiError) {
    const expected = expectedQuantity(error);
    if (error.code === ORDER_ERROR_CODES.maxPerOrder && expected !== null) {
      return { message: t.maxPerOrder(fmtNumber(expected)), field: true, maxPerOrder: expected };
    }
    if (error.code === ORDER_ERROR_CODES.notEnoughStock) {
      return expected === null || expected === 0
        ? { message: t.soldOut, field: true, available: 0 }
        : { message: t.notEnoughStock(fmtNumber(expected)), field: true, available: expected };
    }
    if (error.code === ORDER_ERROR_CODES.priceUndefined) return { message: t.priceUndefined, field: false };
    if (error.code === ORDER_ERROR_CODES.collectionNotFound || error.code === ORDER_ERROR_CODES.notOnSale) {
      return { message: t.notOnSale, field: false };
    }
    if (error.isForbidden) return { message: t.notConsumer, field: false };
  }
  return { message: errorMessage(error), field: false };
}
