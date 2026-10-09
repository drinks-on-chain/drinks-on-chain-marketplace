// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { demoUsers } from "@drinks-on-chain/mocks/fixtures";
import { advanceMockClock, resetErpDb, resetSessions, setupMockServer } from "@drinks-on-chain/mocks/node";
import { login } from "@/lib/account/api";
import { resetSessionForTests } from "@/lib/api/session";
import { fetchCollection } from "@/lib/catalog/api";
import { availableOf } from "@/lib/catalog/sale";
import { createOrder, fetchOrder, fetchOrders, simulatePayment } from "./api";
import { orderFailure, orderPhase, visibleTokens } from "./status";

// [BORRADOR §13.1] La compra (2C) contra los handlers reales de `@drinks-on-chain/mocks`: pedido,
// pasarela de prueba (aprobar, rechazar, demorar), reserva caducada y reglas del pedido.

const ORIGIN = "http://localhost:3005";
const server = setupMockServer();
const consumer = demoUsers.find((u) => u.audience === "CONSUMER")!;
const ON_SALE = "singani-gran-reserva-2026";
// La clave de idempotencia es un UUID (como la genera la hoja de compra).
const nextKey = () => crypto.randomUUID();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  const intercepted = globalThis.fetch;
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
    intercepted(typeof input === "string" && input.startsWith("/") ? `${ORIGIN}${input}` : input, init),
  );
});
beforeEach(() => login({ email: consumer.email, password: consumer.password }));
afterEach(() => {
  server.resetHandlers();
  resetErpDb();
  resetSessions();
  resetSessionForTests();
});
afterAll(() => {
  vi.unstubAllGlobals();
  server.close();
});

describe("pedido y pasarela de prueba", () => {
  it("aparta las botellas, espera el pago y, al aprobarlo, entrega un NFT por botella", async () => {
    const collection = await fetchCollection(ON_SALE);
    const before = availableOf(collection);
    const order = await createOrder({ collectionId: collection.id, quantity: 2 }, nextKey());
    expect(order).toMatchObject({
      status: "AWAITING_PAYMENT",
      quantity: 2,
      unitPrice: collection.price,
      total: { amountMinor: collection.price!.amountMinor * 2, currency: "BOB" },
      payment: { provider: "TEST", status: "PENDING", paidAt: null },
      tokens: [],
    });
    expect(order.reservedUntil).not.toBeNull();
    // Las botellas apartadas dejan de estar disponibles.
    expect(availableOf(await fetchCollection(ON_SALE))).toBe(before - 2);

    // Demorar: la pasarela aún no responde y el pedido sigue esperando.
    const delayed = await simulatePayment(order.payment.id, "DELAY");
    expect(orderPhase(delayed)).toBe("awaiting");
    expect(visibleTokens(delayed)).toEqual([]);

    const paid = await simulatePayment(order.payment.id, "APPROVE");
    expect(paid).toMatchObject({ status: "PAID", payment: { status: "APPROVED" }, reservedUntil: null });
    expect(paid.payment.paidAt).not.toBeNull();
    expect(visibleTokens(paid)).toHaveLength(2);
    // El borrador no adelanta la entrega en la red.
    for (const token of paid.tokens) expect(token).toMatchObject({ transfer: null });
    expect(paid.tokens.map((t) => t.bottleNumber).every((n) => n >= 1 && n <= collection.availability.total)).toBe(
      true,
    );

    await expect(fetchOrder(order.id)).resolves.toMatchObject({ status: "PAID" });
    await expect(simulatePayment(order.payment.id, "APPROVE")).rejects.toMatchObject({
      code: "MKT_PAYMENT_NOT_PENDING",
    });
  });

  it("pago rechazado: sin NFT y las botellas vuelven a estar disponibles", async () => {
    const collection = await fetchCollection(ON_SALE);
    const order = await createOrder({ collectionId: collection.id, quantity: 3 }, nextKey());
    const failed = await simulatePayment(order.payment.id, "REJECT");
    expect(failed).toMatchObject({ status: "PAYMENT_FAILED", payment: { status: "REJECTED" }, tokens: [] });
    expect(orderPhase(failed)).toBe("failed");
    expect(availableOf(await fetchCollection(ON_SALE))).toBe(availableOf(collection));
  });

  it("la reserva caduca sin pago y libera las botellas", async () => {
    const collection = await fetchCollection(ON_SALE);
    const order = await createOrder({ collectionId: collection.id, quantity: 1 }, nextKey());
    advanceMockClock(31 * 60_000);
    const expired = await fetchOrder(order.id);
    expect(expired).toMatchObject({ status: "EXPIRED", tokens: [], reservedUntil: null });
    expect(orderPhase(expired)).toBe("expired");
    expect(availableOf(await fetchCollection(ON_SALE))).toBe(availableOf(collection));
  });

  it("el historial trae los pedidos de quien tiene la sesión, del más reciente al más antiguo", async () => {
    const collection = await fetchCollection(ON_SALE);
    await expect(fetchOrders()).resolves.toMatchObject({ total: 0, items: [] });
    const first = await createOrder({ collectionId: collection.id, quantity: 1 }, nextKey());
    const second = await createOrder({ collectionId: collection.id, quantity: 2 }, nextKey());
    const page = await fetchOrders({ limit: 20, offset: 0 });
    expect(page.total).toBe(2);
    expect(page.items.map((o) => o.id)).toEqual([second.id, first.id]);
  });

  it("la misma `Idempotency-Key` no crea dos pedidos", async () => {
    const collection = await fetchCollection(ON_SALE);
    const sameKey = nextKey();
    const first = await createOrder({ collectionId: collection.id, quantity: 1 }, sameKey);
    const again = await createOrder({ collectionId: collection.id, quantity: 1 }, sameKey);
    expect(again.id).toBe(first.id);
    await expect(fetchOrders()).resolves.toMatchObject({ total: 1 });
  });
});

describe("reglas del pedido", () => {
  it("máximo por compra: el servidor dice cuál es (`expected`) y el formulario lo aprende", async () => {
    const collection = await fetchCollection(ON_SALE);
    const error = await createOrder({ collectionId: collection.id, quantity: 11 }, nextKey()).catch((e) => e);
    expect(error).toMatchObject({ status: 422, code: "MKT_MAX_PER_ORDER" });
    expect(orderFailure(error)).toEqual({
      message: "Puedes comprar hasta 10 botellas por pedido.",
      field: true,
      maxPerOrder: 10,
    });
  });

  it("una colección sin precio no se puede pedir («Precio por anunciar»)", async () => {
    const collection = await fetchCollection("singani-preventa-2026");
    const error = await createOrder({ collectionId: collection.id, quantity: 1 }, nextKey()).catch((e) => e);
    expect(error).toMatchObject({ status: 422, code: "MKT_PRICE_UNDEFINED" });
    expect(orderFailure(error).field).toBe(false);
  });

  it("una colección agotada o inexistente", async () => {
    const soldOut = await fetchCollection("vino-las-carreras-2025");
    await expect(createOrder({ collectionId: soldOut.id, quantity: 1 }, nextKey())).rejects.toMatchObject({
      status: 409,
      code: "MKT_NOT_ENOUGH_STOCK",
    });
    await expect(createOrder({ collectionId: "no-existe", quantity: 1 }, nextKey())).rejects.toMatchObject({
      status: 404,
      code: "MKT_COLLECTION_NOT_FOUND",
    });
  });

  it("un pedido de otra persona no existe para quien pregunta", async () => {
    await expect(fetchOrder("no-es-mio")).rejects.toMatchObject({ status: 404, code: "MKT_ORDER_NOT_FOUND" });
  });
});
