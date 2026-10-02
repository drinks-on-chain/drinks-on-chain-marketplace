// Diccionario del Marketplace. Solo español en el MVP (06, decisiones del 25-09); los textos
// viven aquí para no dispersarlos por los componentes.

/** Código de ejemplo con el control correcto (el del contrato, `K7M2-Q9XA`, es ilustrativo). */
export const EXAMPLE_BOTTLE_CODE = "K7M2-Q9XM";
export const EXAMPLE_LOT_CODE = "CVJ-2026-SINGANI-004";

export const es = {
  app: {
    name: "Drinks on Chain",
    title: "Drinks on Chain · Vinos y singanis de altura",
    description:
      "Vinos y singanis de altura de Tarija y Cinti, Bolivia. Verifica el origen de tu botella con el código de la etiqueta.",
  },
  common: {
    loading: "Cargando…",
    retry: "Reintentar",
    back: "Volver",
    soon: "Próximamente",
    skipToContent: "Saltar al contenido",
    backHome: "Volver al inicio",
  },
  nav: {
    main: "Principal",
    tabs: "Secciones",
    home: "Inicio",
    verify: "Verificar",
    catalog: "Catálogo",
  },
  footer: {
    landing: "Conoce Drinks on Chain",
    wineries: "Bodegas de la red",
    legal: "Vinos y singanis de altura · Tarija y Cinti, Bolivia",
  },
  home: {
    sealTagline: "Tarija y Cinti · Bolivia",
    title: "El origen de cada botella, a la vista",
    lead: "Cada botella lleva un código único en su etiqueta. Con él puedes ver de qué viñedo viene, cómo se elaboró y qué bodega la embotelló.",
    verifyTitle: "Verifica una botella",
    verifyBody: "Busca el código junto al QR de la etiqueta y escríbelo aquí.",
    catalogTitle: "Catálogo",
    catalogBody: "Muy pronto podrás recorrer aquí los vinos y singanis de las bodegas de la red.",
    catalogLink: "Ver el catálogo",
  },
  verify: {
    title: "Verifica una botella",
    lead: "Escribe el código de la etiqueta para ver el origen y la elaboración de tu botella.",
    label: "Código de la botella",
    help: `Son 8 letras y números, por ejemplo ${EXAMPLE_BOTTLE_CODE}. También puedes escribir el código del lote.`,
    submit: "Verificar",
    errors: {
      empty: "Escribe el código que aparece en la etiqueta.",
      "too-short": (count: number) =>
        `El código tiene 8 caracteres y escribiste ${count}. Revisa que no falte ninguno.`,
      "too-long": (count: number) =>
        `El código tiene 8 caracteres y escribiste ${count}. Si es un código de lote, escríbelo con sus guiones, por ejemplo ${EXAMPLE_LOT_CODE}.`,
      characters: "El código solo lleva letras y números, y no usa la letra U. Revisa lo que escribiste.",
      check: "Ese código no es válido: algún carácter está cambiado. Compáralo con la etiqueta.",
    },
    suggestion: "¿Quisiste escribir este código?",
    useSuggestion: (code: string) => `Usar ${code}`,
    where: "¿Dónde está el código?",
    whereBody:
      "En la etiqueta o la contraetiqueta, junto al QR. Las letras O, I y L se leen como 0 y 1: no importa cuál escribas.",
  },
  passport: {
    bottleEyebrow: "Código de botella",
    lotEyebrow: "Código de lote",
    unknownEyebrow: "Código",
    loading: "Buscando el código…",
    foundTitle: "Código reconocido",
    foundBottle: "Este código identifica una botella.",
    foundLot: "Esta etiqueta identifica el lote.",
    foundBody: "Estamos preparando la ficha con el origen y la elaboración. Vuelve pronto.",
    notFoundTitle: "No encontramos este código",
    notFoundBottle:
      "El código está bien escrito, pero no figura en el registro. Compáralo con la etiqueta; si coincide, avisa a la bodega.",
    notFoundLot: "Ese lote no figura en el registro, o todavía no se embotelló. Revisa el código en la etiqueta.",
    malformedTitle: "Este código está mal escrito",
    malformedBody: "Corrígelo aquí y vuelve a intentarlo.",
    rateLimitedTitle: "Demasiados intentos",
    rateLimitedBody: (wait: string | null) =>
      wait
        ? `Por seguridad, espera ${wait} antes de volver a intentarlo.`
        : "Por seguridad, espera unos minutos antes de volver a intentarlo.",
    offlineTitle: "Sin conexión",
    offlineBody: "No pudimos consultar el código. Revisa la red e inténtalo de nuevo.",
    errorTitle: "No pudimos consultar el código",
    errorBody: "El servicio no respondió como esperábamos. Inténtalo de nuevo en unos minutos.",
    another: "Verificar otro código",
    anotherTitle: "¿Tienes otra botella?",
  },
  catalog: {
    title: "Catálogo",
    soonTitle: "El catálogo llega muy pronto",
    soonBody:
      "Aquí podrás recorrer los vinos y singanis de las bodegas de la red. Mientras tanto, puedes verificar una botella con su código.",
    verify: "Verifica una botella",
  },
  errors: {
    notFoundTitle: "Página no encontrada",
    notFoundBody: "La dirección no existe o se ha movido.",
    genericTitle: "Algo salió mal",
    genericBody: "No pudimos mostrar esta página. Inténtalo de nuevo.",
  },
  mocks: {
    title: "Datos de prueba",
    eyebrow: "Solo desarrollo",
    scenario: "Escenario",
    off: "MSW está apagado. Arranca con NEXT_PUBLIC_MOCKS=1 (pnpm dev:mocks) para usar este panel.",
    note: "El dominio público (pasaportes de lote y botella) llega con @drinks-on-chain/mocks 0.5.",
  },
} as const;

export type Dictionary = typeof es;
