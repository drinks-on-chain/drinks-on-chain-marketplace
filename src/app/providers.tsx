"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Spinner, Toaster } from "@drinks-on-chain/ui";
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
 * Sitio público: en esta ola no hay sesión, así que no se recupera nada al arrancar ni se
 * redirige a ningún login (la cuenta por correo llega en la Ola 3, bloque 2B).
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <MocksGate>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </MocksGate>
  );
}
