import type { CollectionSummary } from "./api";

// [BORRADOR §13.1] Estado de venta y disponibilidad de una colección, con los nombres del
// contrato de la Ola 3 (`saleState`, `counts.available`). El borrador de la Ola 2 los llamaba
// `status` y `availability.available`, y los mocks aún envían los dos: todo lo que dependa de
// cuál manda pasa por aquí.

export type SaleState = CollectionSummary["saleState"];

type Sellable = Pick<CollectionSummary, "status" | "availability" | "price"> &
  Partial<Pick<CollectionSummary, "saleState" | "counts">>;

/** `PRESALE` (hasta el anclaje), `ON_SALE` o `SOLD_OUT`. */
export const saleStateOf = (collection: Sellable): SaleState => collection.saleState ?? collection.status;

/** Botellas que aún se pueden comprar. */
export const availableOf = (collection: Sellable): number =>
  collection.counts?.available ?? collection.availability.available;

/** Botellas numeradas de la colección («Botella N de M»). */
export const editionSizeOf = (collection: Sellable): number => collection.availability.total;

export const isSoldOut = (collection: Sellable): boolean =>
  saleStateOf(collection) === "SOLD_OUT" || availableOf(collection) === 0;

/** ¿Se puede comprar? Hace falta precio definido (A-32) y alguna botella disponible. */
export const isPurchasable = (collection: Sellable): boolean => collection.price !== null && !isSoldOut(collection);
