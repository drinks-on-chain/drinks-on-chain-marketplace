"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@drinks-on-chain/ui";
import { useSessionStatus } from "@/lib/account/hooks";
import { es } from "@/lib/i18n/es";
import { NEXT_PARAM, routes, safeNextPath } from "@/lib/links";
import { AuthPanel, type AuthMode } from "./auth-forms";
import { AccountColumn } from "./form-parts";

const t = es.account;

/** Esqueleto mientras se sabe si hay sesión (no un spinner a pantalla completa). */
export function AccountSkeleton() {
  return (
    <div role="status" aria-busy="true" className="grid gap-4">
      <span className="sr-only">{t.profile.loading}</span>
      <Skeleton shape="block" className="h-12" />
      <Skeleton shape="block" className="h-12" />
      <Skeleton shape="block" className="h-12" />
    </div>
  );
}

/**
 * Página de `/entrar` y `/crear-cuenta`. Al entrar vuelve a `?volver=` (solo rutas internas) o a
 * la cuenta. Quien ya tiene sesión no ve el formulario: se le lleva a su destino.
 */
export function AuthScreen({ initialMode }: { initialMode: AuthMode }) {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get(NEXT_PARAM)) ?? routes.account;
  const status = useSessionStatus();
  const [mode, setMode] = useState<AuthMode>(initialMode);

  useEffect(() => {
    if (status === "authenticated") router.replace(next);
  }, [status, router, next]);

  const copy = mode === "login" ? t.login : t.signup;
  return (
    <AccountColumn title={copy.title} lead={copy.lead}>
      {status === "anonymous" ? (
        <AuthPanel initialMode={initialMode} onModeChange={setMode} onAuthenticated={() => router.replace(next)} />
      ) : (
        <AccountSkeleton />
      )}
    </AccountColumn>
  );
}
