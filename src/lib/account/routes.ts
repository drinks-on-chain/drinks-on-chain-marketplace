// Rutas de la cuenta (2B) y de los pedidos (2C), para `src/proxy.ts`. Módulo puro y sin
// dependencias: el proxy corre aparte del código de las páginas.

/** Rutas exactas y, las que acaban en `/`, con todo lo que cuelga de ellas. */
export const ACCOUNT_PATHS = [
  "/entrar",
  "/crear-cuenta",
  "/recuperar-contrasena",
  "/restablecer-contrasena",
  "/verificar-correo",
  "/cuenta",
] as const;

/** Patrones de `config.matcher` del proxy para esas rutas. */
export const ACCOUNT_MATCHERS = [
  "/entrar",
  "/crear-cuenta",
  "/recuperar-contrasena",
  "/restablecer-contrasena",
  "/verificar-correo",
  "/cuenta/:path*",
] as const;

/** Ruta que no existe: reescribir a ella responde el 404 de verdad del sitio. */
export const ACCOUNT_OFF_PATH = "/_sin-cuenta";

/** ¿La ruta es de la cuenta o de los pedidos? (`/cuenta`, `/cuenta/pedidos/…`, `/entrar`…). */
export function isAccountPath(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return ACCOUNT_PATHS.some((base) => path === base || path.startsWith(`${base}/`));
}

/** ¿Está encendida la bandera? (`NEXT_PUBLIC_MK_ACCOUNT=1`; apagada por defecto). */
export const accountFlagOn = (value: string | undefined = process.env.NEXT_PUBLIC_MK_ACCOUNT) => value === "1";
