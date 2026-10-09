"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, StoreShell, focusRing } from "@drinks-on-chain/ui";
import { useSessionStatus } from "@/lib/account/hooks";
import { env } from "@/lib/env";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";
import { storeDesktopNavigation, storeTabs } from "@/lib/navigation";

export const CONTENT_ID = "contenido";

/**
 * Marco público del Marketplace: `StoreShell` (pestañas inferiores en móvil, cabecera en
 * escritorio) con el salto al contenido. Todo se recorre sin cuenta; con la bandera de la cuenta
 * (2B) se añade «Entrar» / «Mi cuenta».
 * Componente cliente porque el shell necesita `Link` y la ruta actual.
 */
/** «Entrar» o «Mi cuenta» en la cabecera de escritorio (en móvil, la pestaña «Cuenta»). */
function AccountAction() {
  const status = useSessionStatus();
  // Mientras no se sabe si hay sesión se reserva el hueco, sin anunciar nada.
  if (status === "unknown") return <span aria-hidden="true" className="hidden h-11 w-24 md:block" />;
  return (
    <Button asChild variant="secondary" size="lg" className="hidden md:inline-flex">
      {status === "authenticated" ? (
        <Link href={routes.account}>{es.account.navAccount}</Link>
      ) : (
        <Link href={routes.login}>{es.account.navLogin}</Link>
      )}
    </Button>
  );
}

export function StoreFrame({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <a
        href={`#${CONTENT_ID}`}
        className={`sr-only z-toast rounded-md bg-bg-raised px-4 py-3 font-ui text-sm font-medium text-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2 ${focusRing}`}
      >
        {es.common.skipToContent}
      </a>
      <StoreShell
        navigation={storeTabs}
        desktopNavigation={storeDesktopNavigation}
        currentPath={pathname}
        linkComponent={Link}
        brandHref={routes.home}
        headerActions={env.account ? <AccountAction /> : undefined}
        labels={{ navigation: es.nav.main, tabs: es.nav.tabs }}
      >
        <div id={CONTENT_ID} tabIndex={-1} className="outline-none">
          {children}
        </div>
        {footer}
      </StoreShell>
    </>
  );
}
