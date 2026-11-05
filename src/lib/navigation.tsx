import { Building2, House, ScanLine, UserRound, Wine } from "lucide-react";
import type { NavItem } from "@drinks-on-chain/ui";
import { env } from "@/lib/env";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";

// Navegación del StoreShell. Solo las secciones que existen: la cava (maqueta 02-marketplace)
// llega en la Ola 4. La pestaña «Cuenta» solo aparece con la bandera `NEXT_PUBLIC_MK_ACCOUNT`
// (2B y 2C contra mocks): sin ella no hay ningún enlace a la cuenta ni a la compra.

/** Pestañas inferiores en móvil (icono obligatorio). */
export const storeTabs: NavItem[] = [
  { label: es.nav.home, href: routes.home, exact: true, icon: <House aria-hidden /> },
  { label: es.nav.catalog, href: routes.catalog, icon: <Wine aria-hidden /> },
  { label: es.nav.verify, href: routes.verify, icon: <ScanLine aria-hidden /> },
  { label: es.nav.wineries, href: routes.wineries, icon: <Building2 aria-hidden /> },
  ...(env.account ? [{ label: es.account.tab, href: routes.account, icon: <UserRound aria-hidden /> }] : []),
];

/** Enlaces de la cabecera de escritorio. */
export const storeDesktopNavigation: NavItem[] = [
  { label: es.nav.catalog, href: routes.catalog },
  { label: es.nav.wineries, href: routes.wineries },
  { label: es.nav.verify, href: routes.verify },
];
