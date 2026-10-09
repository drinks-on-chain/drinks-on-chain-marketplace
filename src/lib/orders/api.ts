import { OrderSchema, type Order, type OrderStatus } from "@drinks-on-chain/mocks";
import { api } from "@/lib/api/client";
import { toPage, type Page, type PageParams } from "@/lib/api/envelope";
import { ApiError } from "@/lib/api/errors";

// ─────────────────────────────────────────────────────────────────────────────────────────────
// BORRADOR · compra (2C). Solo existe con la bandera `NEXT_PUBLIC_MK_ACCOUNT`.
//
// `POST|GET /v1/orders`, `GET /v1/orders/{id}` y `POST /v1/payments/test/{paymentId}/simulate`
// son el **borrador** de la Etapa 4 (contrato de la Ola 3 §13.1): no están en el OpenAPI del
// backend, hoy solo responden los mocks (`X-Mock-Draft`) y pueden cambiar sin aviso. Los fijará
// `plan/contratos/o4-marketplace.md`. Todo lo que depende de su forma vive en `src/lib/orders`.
//
// El borrador no adelanta la entrega en la red (`tokens[].transfer` llega `null`) ni los estados
// `DELIVERING` y `COMPLETED`.
// ─────────────────────────────────────────────────────────────────────────────────────────────

export type { Order, OrderStatus };
export type OrderToken = Order["tokens"][number];
export type PaymentOutcome = "APPROVE" | "REJECT" | "DELAY";

/**
 * [BORRADOR §13.1] `POST /v1/orders` → 201. Aparta las botellas mientras se paga
 * (`reservedUntil`). `idempotencyKey`: la misma para los reintentos del mismo intento de compra,
 * así un doble clic o una red que falla no crean dos pedidos.
 */
export function createOrder(input: { collectionId: string; quantity: number }, idempotencyKey: string): Promise<Order> {
  return api("/v1/orders", { method: "POST", body: input, idempotencyKey, schema: OrderSchema });
}

/** [BORRADOR §13.1] `GET /v1/orders`: los pedidos de quien tiene la sesión, del más reciente al más antiguo. */
export async function fetchOrders(page: PageParams = {}, signal?: AbortSignal): Promise<Page<Order>> {
  return toPage(await api("/v1/orders", { signal, query: { ...page } }), OrderSchema, page);
}

/** [BORRADOR §13.1] `GET /v1/orders/{id}`: se consulta hasta `PAID` para decir «pago recibido». */
export function fetchOrder(id: string, signal?: AbortSignal): Promise<Order> {
  return api(`/v1/orders/${encodeURIComponent(id)}`, { signal, schema: OrderSchema });
}

/**
 * [BORRADOR §13.1] Pasarela **de prueba** (solo desarrollo y mocks): aprueba, rechaza o demora el
 * pago de un pedido. No mueve dinero.
 */
export function simulatePayment(paymentId: string, outcome: PaymentOutcome): Promise<Order> {
  return api(`/v1/payments/test/${encodeURIComponent(paymentId)}/simulate`, {
    method: "POST",
    body: { outcome },
    schema: OrderSchema,
  });
}

/** Códigos del borrador (los definitivos serán los `MKT_…` del contrato de la Ola 4). */
export const ORDER_ERROR_CODES = {
  maxPerOrder: "MKT_MAX_PER_ORDER",
  notEnoughStock: "MKT_NOT_ENOUGH_STOCK",
  priceUndefined: "MKT_PRICE_UNDEFINED",
  collectionNotFound: "MKT_COLLECTION_NOT_FOUND",
  notOnSale: "MKT_COLLECTION_NOT_ON_SALE",
  orderNotFound: "MKT_ORDER_NOT_FOUND",
  paymentNotPending: "MKT_PAYMENT_NOT_PENDING",
} as const;

/** `expected` del primer detalle de un error del pedido (el máximo por compra, o lo que queda). */
export function expectedQuantity(error: unknown): number | null {
  if (!(error instanceof ApiError) || !Array.isArray(error.details)) return null;
  const detail: unknown = error.details[0];
  if (!detail || typeof detail !== "object" || !("expected" in detail)) return null;
  return typeof detail.expected === "number" && Number.isInteger(detail.expected) ? detail.expected : null;
}
