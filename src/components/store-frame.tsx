"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StoreShell, focusRing } from "@drinks-on-chain/ui";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";
import { storeDesktopNavigation, storeTabs } from "@/lib/navigation";

export const CONTENT_ID = "contenido";

/**
 * Marco público del Marketplace: `StoreShell` (pestañas inferiores en móvil, cabecera en
 * escritorio) con el salto al contenido. No hay sesión ni guardias: todo se recorre sin cuenta.
 * Componente cliente porque el shell necesita `Link` y la ruta actual.
 */
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
