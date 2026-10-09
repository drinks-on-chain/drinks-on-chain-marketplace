"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { bootstrapSession, setSessionEndedHandler } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { getSessionStatus, subscribeSession, type SessionStatus } from "@/lib/api/session";
import { env } from "@/lib/env";
import {
  fetchConsumerProfile,
  login,
  logout,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  signup,
  verifyEmail,
} from "./api";

// Sesión del consumidor para las pantallas (2B). Con la bandera apagada no hay sesión: el estado
// es siempre `anonymous` y nunca se llama al backend.

/** Todo lo que pertenece a la persona con sesión cuelga de esta clave (se borra al salir). */
export const ACCOUNT_KEY = ["account"] as const;
export const profileQueryKey = [...ACCOUNT_KEY, "profile"] as const;

const anonymous = (): SessionStatus => "anonymous";

/** `unknown` mientras se recupera la sesión al arrancar; después `authenticated` o `anonymous`. */
export function useSessionStatus(): SessionStatus {
  const status = useSyncExternalStore(subscribeSession, getSessionStatus, () => "unknown" as SessionStatus);
  return env.account ? status : anonymous();
}

/** Lo que cuelga de la cuenta deja de valer cuando cambia quién está dentro. */
export function forgetAccount(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: ACCOUNT_KEY });
}

/**
 * Arranque de la sesión (solo con la bandera): intenta recuperarla con la cookie de renovación y
 * avisa a quien escuche cuando el backend la da por terminada. Se monta una vez, en `Providers`.
 */
export function useSessionBootstrap(onEnded: () => void): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!env.account) return;
    setSessionEndedHandler(() => {
      forgetAccount(queryClient);
      onEnded();
    });
    void bootstrapSession();
    return () => setSessionEndedHandler(() => {});
  }, [queryClient, onEnded]);
}

/** Perfil del consumidor; solo se pide con la sesión abierta. */
export function useConsumerProfile() {
  const status = useSessionStatus();
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: ({ signal }) => fetchConsumerProfile(signal),
    enabled: status === "authenticated",
    staleTime: 60_000,
    // Un 4xx no se arregla repitiendo.
    retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: login, onSuccess: () => forgetAccount(queryClient) });
}

export function useSignup() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: signup, onSuccess: () => forgetAccount(queryClient) });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: logout, onSettled: () => forgetAccount(queryClient) });
}

export const useRequestPasswordReset = () => useMutation({ mutationFn: requestPasswordReset });
export const useResetPassword = () => useMutation({ mutationFn: resetPassword });
export const useResendVerification = () => useMutation({ mutationFn: resendVerification });

export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: verifyEmail, onSuccess: () => forgetAccount(queryClient) });
}
