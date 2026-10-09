// Diccionario del Marketplace. Solo español en el MVP (06, decisiones del 25-09); los textos
// viven aquí para no dispersarlos por los componentes.

/** Código de ejemplo con el control correcto (el del contrato, `K7M2-Q9XA`, es ilustrativo). */
export const EXAMPLE_BOTTLE_CODE = "K7M2-Q9XM";
export const EXAMPLE_LOT_CODE = "CVJ-2026-SINGANI-004";

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const es = {
  app: {
    name: "Drinks on Chain",
    title: "Drinks on Chain · Vinos y singanis de altura",
    description:
      "Vinos y singanis de altura de Tarija y Cinti, Bolivia. Recorre el catálogo y verifica el origen de tu botella con el código de la etiqueta.",
  },
  common: {
    loading: "Cargando…",
    retry: "Reintentar",
    back: "Volver",
    soon: "Próximamente",
    skipToContent: "Saltar al contenido",
    backHome: "Volver al inicio",
    notRecorded: "No registrado",
    pending: "Pendiente",
    yes: "Sí",
    no: "No",
    demoData: "Datos de demostración",
  },
  nav: {
    main: "Principal",
    tabs: "Secciones",
    home: "Inicio",
    verify: "Verificar",
    catalog: "Catálogo",
    wineries: "Bodegas",
  },
  footer: {
    landing: "Conoce Drinks on Chain",
    wineries: "Sitio de las bodegas",
    legal: "Vinos y singanis de altura · Tarija y Cinti, Bolivia",
  },
  productTypes: { WINE: "Vino", SINGANI: "Singani" },
  home: {
    sealTagline: "Tarija y Cinti · Bolivia",
    title: "El origen de cada botella, a la vista",
    lead: "Cada botella lleva un código único en su etiqueta. Con él puedes ver de qué viñedo viene, cómo se elaboró y qué bodega la embotelló.",
    verifyTitle: "Verifica una botella",
    verifyBody: "Busca el código junto al QR de la etiqueta y escríbelo aquí.",
    featuredTitle: "Destacados",
    featuredBody: "Vinos y singanis de las bodegas de la red, con su lote a la vista.",
    featuredLink: "Ver todo el catálogo",
    catalogTitle: "Catálogo",
    catalogBody: "Muy pronto podrás recorrer aquí los vinos y singanis de las bodegas de la red.",
    catalogLink: "Ver el catálogo",
    wineriesTitle: "Las bodegas",
    wineriesBody: "Conoce a quienes elaboran cada botella en los valles de Tarija y Cinti.",
    wineriesLink: "Ver las bodegas",
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

    // Descripción de la página de un lote (metadatos y tarjeta al compartir).
    meta: {
      intro: (type: string, vintage: number, winery: string, region: string) =>
        `${type} de la añada ${vintage} de ${winery} (${region}).`,
      origin: (parcels: string[]) => `Origen: ${parcels.join(", ")}.`,
      bottles: (count: number) => `${new Intl.NumberFormat("es-BO").format(count)} botellas.`,
      dossierClosed: "Expediente cerrado, con su huella.",
      dossierAnchored: "Expediente cerrado, con su huella anclada en la red.",
      lot: (lotCode: string) => `Origen, elaboración y laboratorio del lote ${lotCode}.`,
    },

    // Qué identifica el código (§12.5, punto 2).
    bottleSerial: (serial: string, total: string) => `Botella n.º ${serial} de ${total}`,
    bottleCode: "Código de la botella",
    lotLabel: "Esta etiqueta identifica el lote",
    lotLabelBody: "El código de lote es común a todas sus botellas: no señala una botella concreta.",
    lotCode: "Código del lote",
    toLot: "Ver el lote completo",
    backToBottle: (code: string) => `Volver a tu botella ${code}`,
    haveBottleTitle: "¿Tienes una botella de este lote?",
    haveBottleBody: "Escribe su código para ver su número de serie y comprobarla.",

    // Avisos.
    voidedTitle: "Este código fue anulado por la bodega",
    voidedBody: "Si la etiqueta de tu botella lo muestra, avisa a la bodega.",
    discardedTitle: "La bodega retiró este lote",
    discardedBody: "Su registro sigue visible para que conste su historia.",
    wineryInactiveTitle: "Esta bodega no está activa en la red",
    wineryInactiveBody: "El registro del lote se conserva tal como quedó.",

    // Cabecera (§12.5, punto 3).
    vintage: (year: number) => `Añada ${year}`,
    winery: "Bodega",
    wineryLink: (name: string) => `Ver la página de ${name}`,
    dossierTitle: "Expediente del lote",
    dossierClosed: (date: string) => `Expediente cerrado el ${date}`,
    dossierOpen: "Expediente abierto",
    dossierOpenBody: "La bodega todavía puede añadir registros. Al cerrarlo quedará sellado con una huella.",
    fingerprint: "Huella",
    fingerprintFull: "Ver la huella completa",
    fingerprintBody: "La huella es un resumen único del expediente: si un solo dato cambiara, sería otra.",

    // Anclaje en la red (contrato de la Ola 3 §7.3, PUB-03).
    anchor: {
      title: "Anclaje en la red",
      none: "Sin anclaje",
      anchored: "Anclado",
      anchoredOn: (date: string) => `Anclado el ${date}`,
      noneOpenBody:
        "El expediente de este lote sigue abierto. Cuando la bodega lo cierre, su huella se registrará en la red para que cualquiera pueda comprobarla.",
      pendingLine: "Anclaje en la red: pendiente",
      noneClosedBody:
        "La huella de este expediente todavía no está registrada en la red. Cuando lo esté, aquí podrás comprobarla.",
      pendingBody: (network: string) =>
        `El registro de la huella está en camino a la ${network}. Cuando la red lo confirme, aquí podrás comprobarlo.`,
      anchoredBody: (network: string) =>
        `La huella del expediente quedó registrada en una transacción de la ${network}. Si el expediente cambiara, su huella ya no coincidiría con la registrada.`,
      networks: {
        TESTNET: "red de pruebas de Stellar",
        PUBLIC: "red pública de Stellar",
        LOCAL: "red local de pruebas",
      } as Record<string, string>,
      fingerprint: {
        checking: "Descargando el expediente y recalculando su huella en tu dispositivo…",
        matchTitle: "La huella recalculada coincide",
        matchBody:
          "Descargamos el expediente y recalculamos su huella en tu dispositivo: es la misma que publica la bodega y la que quedó registrada en la red.",
        mismatchTitle: "La huella recalculada no coincide",
        mismatchDossier:
          "La huella que calculamos en tu dispositivo coincide con la registrada en la red, pero no con la que publica el pasaporte.",
        mismatchMemo:
          "La huella que calculamos en tu dispositivo coincide con la que publica el pasaporte, pero no con la registrada en la red.",
        mismatchBoth:
          "La huella que calculamos en tu dispositivo no es la que publica el pasaporte ni la registrada en la red.",
        mismatchAdvice:
          "Puede ser una descarga incompleta: vuelve a intentarlo. Si se repite, avisa a la bodega o a Drinks on Chain.",
        computed: "Huella calculada en tu dispositivo",
        published: "Huella que publica el pasaporte",
        anchored: "Huella registrada en la red",
        failedBody: "No pudimos descargar el expediente para recalcular su huella.",
        unsupportedBody:
          "Este navegador no permite recalcular la huella aquí. Puedes descargar el expediente y calcular su SHA-256 por tu cuenta.",
      },
      checksTitle: "Comprobaciones",
      checksLoading: "Consultando las comprobaciones…",
      checks: {
        DOSSIER_CLOSED: "El expediente está cerrado",
        ANCHOR_CONFIRMED: "La red confirmó el anclaje",
        MEMO_MATCHES_HASH: "El memo de la transacción coincide con la huella",
        ANCHOR_ACCOUNT_OFFICIAL: "La cuenta de anclaje es la oficial de Drinks on Chain",
      },
      results: {
        pass: "Cumple",
        fail: "No cumple",
        notYet: "Aún no aplica",
        unknown: "No se puede comprobar aquí",
      },
      sourceServer: "Comprobaciones hechas por el servidor de Drinks on Chain.",
      sourceServerAt: (date: string) =>
        `Comprobaciones hechas por el servidor de Drinks on Chain al confirmarse el anclaje (${date} UTC).`,
      sourceViewer:
        "El servicio de verificación aún no está disponible: estas comprobaciones salen de los datos del propio pasaporte.",
      sourceViewerAfterError:
        "No pudimos consultar el servicio de verificación: estas comprobaciones salen de los datos del propio pasaporte.",
      network: "Red",
      account: "Cuenta de anclaje",
      transaction: "Transacción",
      ledger: "Bloque de la red",
      explorer: "Ver la transacción en el explorador",
      explorerHelp:
        "El explorador es un sitio independiente: ahí puedes ver la transacción y su memo sin pasar por Drinks on Chain.",
    },
    download: "Descargar expediente",
    downloading: "Descargando…",
    downloadHelp: "Archivo JSON con el contenido exacto del expediente, para recalcular su huella.",
    downloadFailed: "No pudimos descargar el expediente. Inténtalo de nuevo.",

    // Comprobación de la botella contra el expediente (prueba Merkle).
    proof: {
      title: "Comprobación del código",
      checking: "Comprobando el código con el expediente…",
      verifiedTitle: "Este código pertenece al expediente cerrado",
      verifiedBody:
        "Lo comprobamos en tu dispositivo: el código de esta botella está entre los que la bodega selló al cerrar el expediente, y el expediente no cambió desde entonces.",
      openBody:
        "La bodega aún no cerró el expediente de este lote. Cuando lo cierre, aquí podrás comprobar que tu código forma parte de él.",
      mismatchRootTitle: "No pudimos confirmar este código",
      mismatchRootBody:
        "El código no está entre los que la bodega selló al cerrar el expediente. Si la etiqueta lo muestra, avisa a la bodega.",
      mismatchHashTitle: "El expediente no coincide con su huella",
      mismatchHashBody:
        "El expediente descargado no da la huella publicada. Vuelve a intentarlo; si se repite, avisa a la bodega.",
      failedBody: "No pudimos descargar el expediente para comprobar el código.",
      unsupportedBody:
        "Este navegador no permite hacer la comprobación aquí. Puedes descargar el expediente y comprobarlo por tu cuenta.",
    },

    // Origen y Denominación de Origen (§12.5, punto 4).
    originTitle: "Origen",
    parcel: "Parcela",
    altitude: (masl: string) => `${masl} m s. n. m.`,
    variety: "Variedad",
    region: "Región",
    doTitle: "Denominación de Origen",
    doNotApplicable: "Este producto no lleva Denominación de Origen.",
    doStatuses: {
      ELIGIBLE: "Cumple la Denominación de Origen",
      ELIGIBLE_BY_EXCEPTION: "Cumple por excepción legal",
      NOT_ELIGIBLE: "No cumple la Denominación de Origen",
      NOT_APPLICABLE: "No aplica",
    },
    doParcel: {
      ELIGIBLE: "Apta",
      ELIGIBLE_BY_EXCEPTION: "Apta por excepción",
      NOT_ELIGIBLE: "No apta",
      NOT_APPLICABLE: "No aplica",
    },
    doRules: (altitude: string, varieties: string) =>
      `Reglas aplicadas a este lote: parcelas a ${altitude} m s. n. m. o más, y uva de ${varieties}.`,
    doException:
      "Este lote cumple por una excepción legal autorizada: alguno de sus valores está por debajo del mínimo general.",

    // Elaboración (§12.5, punto 5).
    processTitle: "Elaboración",
    stages: {
      harvest: "Vendimia",
      fermentation: "Fermentación",
      aging: "Crianza",
      distillation: "Destilación y reposo",
      bottling: "Embotellado",
    },
    fields: {
      intake: "Recepción de la uva",
      phytosanitary: "Dictamen fitosanitario",
      phytoApproved: "Aprobado",
      maturity: "Madurez de la uva",
      start: "Inicio",
      end: "Fin",
      readings: "Lecturas registradas",
      treatments: "Tratamientos",
      noTreatments: "Ninguno registrado",
      authorization: "Autorización",
      container: "Recipiente",
      plannedMonths: "Crianza prevista",
      unlockDate: "Fin de la crianza",
      heartAbv: "Grado del corazón",
      restMinDays: "Reposo mínimo",
      restUntil: "Fin del reposo",
      bottlingDate: "Fecha",
      bottles: "Botellas",
      format: "Formato",
      finalAbv: "Grado alcohólico",
    },
    maturity: (brix: string, ph: string, acidity: string) => `${brix} °Brix · pH ${ph} · acidez ${acidity} g/L`,
    months: (n: number) => `${n} ${plural(n, "mes", "meses")}`,
    days: (n: string) => `${n} días`,
    abv: (value: string) => `${value} % vol`,
    centiliters: (value: number) => `${value} cL`,
    dateRange: (from: string, to: string) => (from === to ? from : `${from} – ${to}`),
    treatments: {
      ACIDITY_CORRECTION: "Corrección de acidez",
      SO2_ADDITION: "Adición de sulfuroso",
      CLARIFICATION: "Clarificación",
      FILTRATION_AID: "Coadyuvante de filtración",
      NUTRIENT_ADDITION: "Nutrientes",
      ENZYME_ADDITION: "Enzimas",
      OAK_CHIPS: "Virutas de roble",
      FINING_AGENT: "Clarificante",
      STABILIZATION: "Estabilización",
      OTHER: "Otro tratamiento",
    } as Record<string, string>,

    // Línea de tiempo.
    timelineTitle: "Registro del lote",
    timelineEmpty: "La bodega no publicó registros de este lote.",
    lateEntry: (date: string) => `Anotado después, el ${date}`,
    corrected: "Corregido",
    roles: {
      OWNER: "Dirección de la bodega",
      ENOLOGIST: "Enología",
      AGRONOMIST: "Agronomía",
      OPERATOR: "Operación de bodega",
      ACCOUNTANT: "Administración",
    } as Record<string, string>,
    systemRole: "Registro automático",
    corrections: (count: number, lastAt: string | null) =>
      count === 0
        ? "Sin correcciones registradas."
        : `${count} ${plural(count, "corrección registrada", "correcciones registradas")}${lastAt ? `; la última, el ${lastAt}` : ""}.`,

    // Laboratorio (§12.5, punto 6).
    labTitle: "Laboratorio",
    labStatuses: {
      CONFORMING: "Conforme",
      NON_CONFORMING: "No conforme",
      INCOMPLETE: "Incompleto",
      NOT_RECORDED: "No registrado",
    },
    labNotRecordedBody: "La bodega no registró un análisis de laboratorio de este lote.",
    laboratory: "Laboratorio",
    testedAt: "Fecha del análisis",
    labColumns: { parameter: "Parámetro", value: "Resultado", limit: "Límite", result: "Estado" },
    labParameters: {
      metanol: "Metanol",
      cobre: "Cobre",
      acidezVolatil: "Acidez volátil",
      grado: "Grado alcohólico",
    } as Record<string, string>,
    labResults: { PASS: "Cumple", FAIL: "No cumple", MISSING: "Sin dato", UNIT_UNKNOWN: "Unidad no reconocida" },
    limitMax: (value: string, unit: string) => `máx. ${value} ${unit}`,
    limitMin: (value: string, unit: string) => `mín. ${value} ${unit}`,
    noLimit: "Sin límite fijado",

    // Reglas del lote (§12.5, punto 7).
    rulesTitle: "Reglas con las que se hizo el lote",
    rulesTakenAt: (date: string) => `Fijadas el ${date}; los cambios posteriores no afectan a este lote.`,
    rulesMigration: "Reglas fijadas al pasar el lote al registro actual.",
    legalException: "Excepción legal",

    // Documentos públicos.
    attachmentsTitle: "Documentos públicos",
    attachmentKinds: {
      LAB_REPORT: "Informe de laboratorio",
      PHYTO_REPORT: "Dictamen fitosanitario",
      LABEL: "Etiqueta",
      DO_CERTIFICATE: "Certificado de D.O.",
      PHOTO: "Fotografía",
      OTHER: "Documento",
    } as Record<string, string>,
  },
  catalog: {
    title: "Catálogo",
    lead: "Vinos y singanis de altura de las bodegas de la red. Cada colección sale de un lote con su historia registrada.",
    draftNote: "Precios y disponibilidad de ejemplo: la venta todavía no está abierta.",
    soonTitle: "El catálogo llega muy pronto",
    soonBody:
      "Aquí podrás recorrer los vinos y singanis de las bodegas de la red. Mientras tanto, puedes verificar una botella con su código.",
    verify: "Verifica una botella",
    filters: "Filtros",
    type: "Tipo",
    status: "Estado",
    winery: "Bodega",
    all: "Todos",
    allWineries: "Todas las bodegas",
    sort: "Ordenar por",
    sorts: {
      featured: "Destacadas",
      newest: "Más recientes",
      "price-asc": "Precio: de menor a mayor",
      "price-desc": "Precio: de mayor a menor",
      name: "Nombre",
    },
    search: "Buscar",
    searchPlaceholder: "Nombre o bodega",
    searchSubmit: "Buscar",
    clear: "Quitar filtros",
    results: (n: number) => `${n} ${plural(n, "colección", "colecciones")}`,
    emptyTitle: "Aún no hay colecciones publicadas",
    emptyBody: "Vuelve pronto: las bodegas están preparando sus primeras colecciones.",
    noMatchTitle: "Ninguna colección coincide",
    noMatchBody: "Prueba con otros filtros o quítalos para ver todo el catálogo.",
    errorTitle: "No pudimos cargar el catálogo",
    statuses: { PRESALE: "Preventa", ON_SALE: "A la venta", SOLD_OUT: "Agotado" },
    priceTba: "Precio por anunciar",
    pricePerBottle: "por botella",
    available: (available: string, total: string) => `Quedan ${available} de ${total} botellas`,
    soldOut: "Sin botellas disponibles",
    readyDate: (date: string) => `Lista hacia el ${date}`,
    lotStage: "Estado del lote",
    lotStages: {
      ORIGIN: "En el viñedo",
      HARVEST: "En vendimia",
      FERMENTING: "Fermentando",
      AGING: "En crianza",
      DISTILLING: "Destilando",
      RESTING: "En reposo",
      BOTTLED: "Embotellado",
      CERTIFIED: "Embotellado, con el expediente cerrado",
      ANCHORED: "Embotellado, con el expediente anclado en la red",
      REJECTED: "Rechazado",
      DISCARDED: "Retirado",
    } as Record<string, string>,
    notify: "Avísame",
    notifyBody: "La compra llega pronto. Apúntate a la lista de espera y te avisamos cuando abra.",
    notifySoon: "La compra llega pronto.",
    about: "La colección",
    tastingNotes: "Notas de cata",
    pairing: "Maridaje",
    journey: "El lote, paso a paso",
    passportLink: "Ver el pasaporte del lote",
    passportPending: "El pasaporte del lote se publica cuando se embotella.",
    notFoundTitle: "No encontramos esta colección",
    notFoundBody: "Puede que ya no esté publicada.",
    back: "Volver al catálogo",
    wineryCollections: "Más de esta bodega",
  },
  wineries: {
    title: "Bodegas",
    lead: "Las bodegas y destilerías de la red, en los valles de altura del sur de Bolivia.",
    categories: { WINERY: "Bodega", DISTILLERY: "Destilería", BREWERY: "Cervecería", OTHER: "Productor" },
    emptyTitle: "Aún no hay bodegas publicadas",
    emptyBody: "Vuelve pronto: la red está creciendo.",
    errorTitle: "No pudimos cargar las bodegas",
    story: "Historia",
    noStory: "Esta bodega aún no publicó su historia.",
    website: "Sitio web",
    websiteLink: (name: string) => `Sitio web de ${name}`,
    collections: "Colecciones de esta bodega",
    noCollections: "Esta bodega aún no tiene colecciones publicadas.",
    notFoundTitle: "No encontramos esta bodega",
    notFoundBody: "Puede que ya no esté activa en la red.",
    back: "Ver todas las bodegas",
    profileOf: (name: string) => `Ver ${name}`,
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
    note: "Afecta a las rutas simuladas: pasaportes, bodegas y el borrador del catálogo.",
  },
} as const;

export type Dictionary = typeof es;
