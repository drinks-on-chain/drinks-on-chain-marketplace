import { describe, expect, it } from "vitest";
import { publicFixtures } from "@drinks-on-chain/mocks/fixtures";
import { availableOf, editionSizeOf, isPurchasable, isSoldOut, saleStateOf } from "./sale";

// [BORRADOR §13.1] `saleState` y `counts.available` mandan; `status` y `availability.available`
// son los nombres del borrador de la Ola 2, que los mocks aún envían.

const collection = (slug: string) => structuredClone(publicFixtures.collections.find((c) => c.slug === slug)!);

describe("estado de venta de una colección", () => {
  it("lee `saleState` y `counts.available` cuando llegan", () => {
    const c = collection("singani-gran-reserva-2026");
    c.status = "PRESALE";
    c.saleState = "ON_SALE";
    c.availability.available = 1;
    c.counts.available = 7;
    expect(saleStateOf(c)).toBe("ON_SALE");
    expect(availableOf(c)).toBe(7);
    expect(editionSizeOf(c)).toBe(60);
  });

  it("sin ellos (borrador de la Ola 2) cae en `status` y `availability`", () => {
    const old: Partial<ReturnType<typeof collection>> &
      Pick<ReturnType<typeof collection>, "status" | "availability" | "price"> =
      collection("singani-gran-reserva-2026");
    delete old.saleState;
    delete old.counts;
    expect(saleStateOf(old)).toBe("ON_SALE");
    expect(availableOf(old)).toBe(60);
  });

  it("agotada: por su estado o porque no queda ninguna", () => {
    expect(isSoldOut(collection("vino-las-carreras-2025"))).toBe(true);
    const c = collection("singani-gran-reserva-2026");
    expect(isSoldOut(c)).toBe(false);
    c.counts.available = 0;
    expect(isSoldOut(c)).toBe(true);
  });

  it("solo se puede comprar con precio definido y botellas disponibles", () => {
    expect(isPurchasable(collection("singani-gran-reserva-2026"))).toBe(true);
    // Preventa real sin precio (A-32): «Precio por anunciar».
    expect(isPurchasable(collection("singani-preventa-2026"))).toBe(false);
    expect(isPurchasable(collection("vino-las-carreras-2025"))).toBe(false);
  });
});
