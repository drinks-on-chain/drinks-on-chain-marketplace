import { env } from "@/lib/env";

// Rutas propias y enlaces a los otros sitios del ecosistema. Los hosts solo llegan por
// NEXT_PUBLIC_URL_*; nunca se escriben en los componentes (CLAUDE.md de la carpeta paraguas).

/** `base` + `path`, sin barras duplicadas; `null` si el sitio no está configurado. */
export const join = (base: string, path = "/") => (base ? `${base.replace(/\/+$/, "")}${path}` : null);

/** Parámetro con el que la página del lote recuerda de qué botella se llegó. */
export const FROM_BOTTLE_PARAM = "desde";

/** Rutas internas del Marketplace. */
export const routes = {
  home: "/",
  /** Entrada manual del código ("Verifica una botella"). */
  verify: "/b",
  /** Visor público de un código de botella o de lote (canónico, sin guion en el de botella). */
  passport: (code: string) => `/b/${encodeURIComponent(code)}`,
  /** Pasaporte del lote al que se llega desde una botella (para poder volver a ella). */
  lotFromBottle: (lotCode: string, bottleCode: string) =>
    `/b/${encodeURIComponent(lotCode)}?${FROM_BOTTLE_PARAM}=${encodeURIComponent(bottleCode)}`,
  catalog: "/catalogo",
  /** Ficha de una colección (hasta la Ola 2 vivía en `/catalogo/{slug}`, que redirige aquí). */
  collection: (slug: string) => `/colecciones/${encodeURIComponent(slug)}`,
  wineries: "/bodegas",
  winery: (slug: string) => `/bodegas/${encodeURIComponent(slug)}`,
} as const;

/** Origen con el que la landing registra las inscripciones que llegan desde aquí. */
export const WAITLIST_SOURCE = "marketplace";

/** Enlaces con los hosts de un entorno concreto (inyectable en las pruebas). */
export function buildLinks(urls: { landing: string; bodegas: string; app: string }) {
  return {
    /** Landing principal; `null` si no está configurada (el enlace no se muestra). */
    landing: join(urls.landing),
    /** Lista de espera de la landing ("Avísame"); `null` si la landing no está configurada. */
    waitlist: join(urls.landing, `/lista-de-espera?src=${WAITLIST_SOURCE}`),
    /** Sitio de las bodegas; `null` si no está configurado. */
    bodegas: join(urls.bodegas),
    /** Origen público del Marketplace (`metadataBase`); `null` si no está configurado. */
    app: join(urls.app, ""),
    /** URL absoluta del visor de un código (la que lleva el QR); `null` sin `NEXT_PUBLIC_URL_APP`. */
    passportUrl: (code: string) => join(urls.app, routes.passport(code)),
  };
}

export const links = buildLinks({ landing: env.urlLanding, bodegas: env.urlBodegas, app: env.urlApp });
