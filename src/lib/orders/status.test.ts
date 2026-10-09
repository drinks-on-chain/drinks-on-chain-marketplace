import { describe, expect, it } from "vitest";
import { ApiError, NetworkError } from "@/lib/api/errors";
import type { Order } from "./api";
import { isOrderOpen, maxQuantity, orderFailure, orderPhase, parseQuantity, visibleTokens } from "./status";

const order = (status: Order["status"], tokens: Order["tokens"] = []): Order => ({
  id: "o-1",
  status,
  collection: {
    id: "c-1",
    slug: "singani-gran-reserva-2026",
    name: "Singani Gran Reserva 2026",
    coverImageUrl: null,
    winery: { slug: "destileria-cinti-viejo", tradeName: "Destilería Cinti Viejo" },
  },
  quantity: 2,
  unitPrice: { amountMinor: 28000, currency: "BOB" },
  total: { amountMinor: 56000, currency: "BOB" },
  reservedUntil: null,
  payment: { id: "p-1", provider: "TEST", status: "PENDING", paidAt: null },
  tokens,
  createdAt: "2026-10-09T12:00:00Z",
  updatedAt: "2026-10-09T12:00:00Z",
});

const tokens: Order["tokens"] = [
  { tokenId: 0, bottleNumber: 1, transfer: null },
  { tokenId: 1, bottleNumber: 2, transfer: null },
];

describe("fase de un pedido", () => {
  it("espera el pago, pago recibido, pago fallido y reserva caducada", () => {
    expect(orderPhase(order("CREATED"))).toBe("awaiting");
    expect(orderPhase(order("AWAITING_PAYMENT"))).toBe("awaiting");
    expect(orderPhase(order("PAID"))).toBe("paid");
    // La entrega (Ola 4) no cambia que el pago ya se recibió.
    expect(orderPhase(order("DELIVERING"))).toBe("paid");
    expect(orderPhase(order("COMPLETED"))).toBe("paid");
    expect(orderPhase(order("PAYMENT_FAILED"))).toBe("failed");
    expect(orderPhase(order("EXPIRED"))).toBe("expired");
  });

  it("solo se sigue consultando mientras espera el pago", () => {
    expect(isOrderOpen(order("AWAITING_PAYMENT"))).toBe(true);
    for (const status of ["PAID", "PAYMENT_FAILED", "EXPIRED"] as const) expect(isOrderOpen(order(status))).toBe(false);
  });

  it("A-23: los NFT no se enseñan sin el pago recibido, aunque la respuesta los trajera", () => {
    expect(visibleTokens(order("AWAITING_PAYMENT", tokens))).toEqual([]);
    expect(visibleTokens(order("PAYMENT_FAILED", tokens))).toEqual([]);
    expect(visibleTokens(order("EXPIRED", tokens))).toEqual([]);
    expect(visibleTokens(order("PAID", tokens))).toEqual(tokens);
  });
});

describe("cantidad", () => {
  it("el máximo es lo disponible y, cuando se conoce, el máximo por compra", () => {
    expect(maxQuantity(60, null)).toBe(60);
    expect(maxQuantity(60, 10)).toBe(10);
    expect(maxQuantity(3, 10)).toBe(3);
    expect(maxQuantity(0, 10)).toBe(0);
  });

  it("solo vale un entero entre 1 y el máximo", () => {
    expect(parseQuantity(" 2 ", 10)).toBe(2);
    expect(parseQuantity("10", 10)).toBe(10);
    for (const bad of ["", "0", "11", "1,5", "1.5", "-1", "dos", "1e1"]) expect(parseQuantity(bad, 10)).toBeNull();
  });
});

describe("rechazo de un pedido", () => {
  const rejected = (status: number, code: string, expected?: number) =>
    new ApiError({
      status,
      code,
      message: "mensaje del backend",
      details: expected === undefined ? undefined : [{ field: "quantity", message: "x", expected, actual: 11 }],
    });

  it("máximo por compra: junto al campo, y el formulario aprende el máximo", () => {
    expect(orderFailure(rejected(422, "MKT_MAX_PER_ORDER", 10))).toEqual({
      message: "Puedes comprar hasta 10 botellas por pedido.",
      field: true,
      maxPerOrder: 10,
    });
  });

  it("existencias: cuántas quedan, o que se agotó", () => {
    expect(orderFailure(rejected(409, "MKT_NOT_ENOUGH_STOCK", 3))).toEqual({
      message: "Solo quedan 3 botellas disponibles.",
      field: true,
      available: 3,
    });
    expect(orderFailure(rejected(409, "MKT_NOT_ENOUGH_STOCK", 0))).toMatchObject({
      message: "La colección se acaba de agotar.",
      available: 0,
    });
  });

  it("sin precio, colección retirada, cuenta que no es de cliente y sin conexión: aviso general", () => {
    expect(orderFailure(rejected(422, "MKT_PRICE_UNDEFINED"))).toEqual({
      message: "Esta colección todavía no tiene precio.",
      field: false,
    });
    expect(orderFailure(rejected(404, "MKT_COLLECTION_NOT_FOUND")).message).toBe(
      "Esta colección ya no está a la venta.",
    );
    expect(orderFailure(rejected(403, "FORBIDDEN")).message).toBe("Con esta cuenta no se puede comprar.");
    expect(orderFailure(new NetworkError(null))).toEqual({
      message: "No se pudo conectar con el servidor.",
      field: false,
    });
  });
});
