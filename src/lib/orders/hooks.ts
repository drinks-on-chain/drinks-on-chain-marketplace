"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ACCOUNT_KEY, useSessionStatus } from "@/lib/account/hooks";
import { ApiError } from "@/lib/api/errors";
import {
  createOrder,
  fetchOrder,
  fetchOrders,
  fetchPurchaseSettings,
  simulatePayment,
  type Order,
  type PaymentOutcome,
} from "./api";
import { isOrderOpen } from "./status";

// [BORRADOR §13.1] Hooks de la compra: ver el aviso de `api.ts`. Cuelgan de `ACCOUNT_KEY`, así
// que se olvidan al cerrar la sesión.

export const ordersKey = [...ACCOUNT_KEY, "orders"] as const;
export const orderKey = (id: string) => [...ordersKey, "detail", id] as const;

export const ORDERS_PAGE_SIZE = 20;
/** Cada cuánto se vuelve a consultar un pedido que espera su pago. */
export const ORDER_POLL_MS = 3_000;

const retry = (count: number, error: unknown) => !(error instanceof ApiError && error.status < 500) && count < 2;

/**
 * Reglas de la compra (máximo por pedido, minutos de reserva). Solo se piden al abrir la hoja de
 * compra; si fallan, la compra sigue y el servidor hace valer el máximo al crear el pedido.
 */
export function usePurchaseSettings(enabled: boolean) {
  return useQuery({
    queryKey: ["public", "purchase-settings"] as const,
    queryFn: ({ signal }) => fetchPurchaseSettings(signal),
    enabled,
    staleTime: 300_000,
    retry,
  });
}

/** Historial de pedidos de quien tiene la sesión. */
export function useOrders(offset = 0) {
  const status = useSessionStatus();
  return useQuery({
    queryKey: [...ordersKey, "list", offset] as const,
    queryFn: ({ signal }) => fetchOrders({ limit: ORDERS_PAGE_SIZE, offset }, signal),
    enabled: status === "authenticated",
    retry,
  });
}

/**
 * Un pedido. Mientras espera el pago se consulta cada pocos segundos (la pasarela avisa al
 * backend, no al navegador): así aparece «pago recibido», el rechazo o la reserva caducada.
 */
export function useOrder(id: string | null) {
  const status = useSessionStatus();
  return useQuery({
    queryKey: orderKey(id ?? ""),
    queryFn: ({ signal }) => fetchOrder(id ?? "", signal),
    enabled: status === "authenticated" && id !== null,
    retry,
    refetchInterval: (query) => (query.state.data && isOrderOpen(query.state.data) ? ORDER_POLL_MS : false),
  });
}

/** Lo que cambia cuando un pedido nace o se resuelve: el historial y la disponibilidad del catálogo. */
function useOrderSettled() {
  const queryClient = useQueryClient();
  return (order: Order) => {
    queryClient.setQueryData(orderKey(order.id), order);
    void queryClient.invalidateQueries({ queryKey: [...ordersKey, "list"] });
    void queryClient.invalidateQueries({ queryKey: ["public", "collections"] });
  };
}

export function useCreateOrder() {
  const settled = useOrderSettled();
  return useMutation({
    mutationFn: (input: { collectionId: string; quantity: number; idempotencyKey: string }) =>
      createOrder({ collectionId: input.collectionId, quantity: input.quantity }, input.idempotencyKey),
    onSuccess: settled,
  });
}

/** Pasarela de prueba: aprobar, rechazar o demorar el pago. */
export function useSimulatePayment() {
  const settled = useOrderSettled();
  return useMutation({
    mutationFn: (input: { paymentId: string; outcome: PaymentOutcome }) =>
      simulatePayment(input.paymentId, input.outcome),
    onSuccess: settled,
  });
}
