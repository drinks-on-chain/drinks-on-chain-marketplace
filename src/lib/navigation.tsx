import { Building2, House, ScanLine, Wine } from "lucide-react";
import type { NavItem } from "@drinks-on-chain/ui";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";

// Navegación del StoreShell. Solo las secciones que existen en esta ola: la cava y el perfil
// (maqueta 02-marketplace) llegan con la cuenta por correo (Ola 3) y la cava (Ola 4).

/** Pestañas inferiores en móvil (icono obligatorio). */
export const storeTabs: NavItem[] = [
  { label: es.nav.home, href: routes.home, exact: true, icon: <House aria-hidden /> },
  { label: es.nav.catalog, href: routes.catalog, icon: <Wine aria-hidden /> },
  { label: es.nav.verify, href: routes.verify, icon: <ScanLine aria-hidden /> },
  { label: es.nav.wineries, href: routes.wineries, icon: <Building2 aria-hidden /> },
];

/** Enlaces de la cabecera de escritorio. */
export const storeDesktopNavigation: NavItem[] = [
  { label: es.nav.catalog, href: routes.catalog },
  { label: es.nav.wineries, href: routes.wineries },
  { label: es.nav.verify, href: routes.verify },
];
