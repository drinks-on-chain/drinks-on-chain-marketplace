"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Spinner, Toaster, toast } from "@drinks-on-chain/ui";
import { useSessionBootstrap } from "@/lib/account/hooks";
import { env } from "@/lib/env";
import { es } from "@/lib/i18n/es";
import { makeQueryClient } from "@/lib/query-client";

/** Con NEXT_PUBLIC_MOCKS=1 no pinta la app hasta que MSW intercepta las peticiones. */
function MocksGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!env.mocks);
  useEffect(() => {
    if (!env.mocks) return;
    // MSW responde en /api/v1/* de este origen (P-1).
    import("@drinks-on-chain/mocks/browser")
      .then(({ startMockWorker }) => startMockWorker({ quiet: true }))
      .then(() => setReady(true));
  }, []);
  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center" aria-busy="true">
        <Spinner label={es.common.loading} />
      </div>
    );
  }
  return children;
}

/**
 * Recupera la sesión del consumidor al arrancar (solo con la bandera `NEXT_PUBLIC_MK_ACCOUNT`;
 * sin ella no se llama a nada) y avisa si el backend la da por terminada. No redirige: el sitio
 * es público y cada página de la cuenta ofrece entrar donde hace falta.
 */
function SessionBootstrap() {
  const onEnded = useCallback(() => toast({ title: es.account.sessionEnded, tone: "warning" }), []);
  useSessionBootstrap(onEnded);
  return null;
}

/**
 * Sitio público: todo se recorre sin cuenta. La cuenta por correo (2B) y la compra (2C) solo
 * existen con su bandera, que está apagada contra el backend real.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <MocksGate>
      <QueryClientProvider client={queryClient}>
        <SessionBootstrap />
        {children}
        <Toaster />
      </QueryClientProvider>
    </MocksGate>
  );
}
