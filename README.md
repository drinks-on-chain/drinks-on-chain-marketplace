# drinks-on-chain-marketplace

S2 · **Marketplace** del ecosistema **Drinks on Chain** (`app.`): sitio público B2C, móvil primero. Aquí se verifica una botella con el código de su etiqueta (visor `/b/{código}`), se recorre el catálogo y se conoce a las bodegas; la cuenta, la compra y la cava llegan en las olas siguientes. Nació de [`drinks-on-chain-app-template`](https://github.com/drinks-on-chain/drinks-on-chain-app-template) (remoto `template`). Planificación en `docs/ROADMAP.md` y en [drinks-on-chain-docsfront](https://github.com/BrianKGR01/drinks-on-chain-docsfront) (roadmap 03 §6, bloques 2A–2F).

## Qué hay hoy (Ola 2 · O2-MK-1)

| Pieza                                                                                                                                                  | Dónde                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Next.js 16 (App Router, Turbopack), React 19, TypeScript estricto, Tailwind 4                                                                          | —                                                                           |
| `StoreShell` de `@drinks-on-chain/ui`: pestañas inferiores en móvil (Inicio, Catálogo, Verificar, Bodegas), cabecera en escritorio, salto al contenido | `src/components/store-frame.tsx`, `src/lib/navigation.tsx`                  |
| Portada: marca, "Verifica una botella", destacados del catálogo y bodegas                                                                              | `src/app/(store)/page.tsx`, `src/components/home/`                          |
| **2E · Visor** `/b/[code]`: pasaporte de botella o de lote contra `GET /v1/public/passports/{code}`, con sus estados                                   | `src/app/(store)/b/`, `src/components/passport/`, `src/lib/passport/`       |
| Códigos: `parseCode()` (botella, lote o "mal escrito" con motivo y sugerencia) sobre las reglas de `@drinks-on-chain/mocks`                            | `src/lib/codes/`                                                            |
| **2A · Catálogo sin cuenta** y ficha de colección, contra el **borrador** `/v1/public/collections`                                                     | `src/app/(store)/catalogo/`, `src/components/catalog/`, `src/lib/catalog/`  |
| Bodegas: directorio y página de bodega (`GET /v1/public/wineries` y `/{slug}`)                                                                         | `src/app/(store)/bodegas/`, `src/components/wineries/`, `src/lib/wineries/` |
| Componentes de tienda locales, **pendientes de mover a `@drinks-on-chain/ui`**: `JourneyTimeline`, `BottleCard`, `BottleArt`, `PriceTag`, `CodeInput`  | `src/components/store/`                                                     |
| `/trace/batch/{lote}` (URL del QR antiguo) → 308 a `/b/{lote}`                                                                                         | `next.config.ts`                                                            |
| PWA básica: manifest, `theme-color`, iconos provisionales                                                                                              | `src/app/manifest.ts`, `public/icons/`, `scripts/generate-icons.mjs`        |
| Cliente de API tipado contra `/api/v1/*` del propio origen, con el proxy que firma la IP del visitante                                                 | `src/lib/api/`, `src/proxy.ts`, `src/lib/api-proxy.ts`                      |
| Datos de prueba `@drinks-on-chain/mocks` 0.5.0-rc.3 con MSW en el navegador y panel `/__mocks`                                                         | `src/app/providers.tsx` (`MocksGate`), `src/app/%5F%5Fmocks`                |
| Rutas propias y enlaces a los otros sitios (hosts solo por `NEXT_PUBLIC_URL_*`)                                                                        | `src/lib/links.ts`                                                          |
| Textos en español                                                                                                                                      | `src/lib/i18n/es.ts`                                                        |
| Vitest + Testing Library (unitarias y de integración contra los handlers de los mocks), Playwright (390 px y 1280 px) con axe, ESLint, Prettier, CI    | `vitest.config.mts`, `playwright.config.ts`, `.github/workflows/ci.yml`     |

**No hay sesión**: el Marketplace de esta ola no autentica a nadie (la cuenta por correo llega en la Ola 3, bloque 2B) ni vende nada (la compra, en las Olas 3–4). De la plantilla se retiraron el login con roles, la guardia por audiencia, el selector de organización y `src/lib/auth`.

## Empezar

Requisitos: Node 22 (`.nvmrc`) y pnpm 10 (`corepack enable`).

```bash
pnpm install
cp .env.example .env.local
pnpm dev:mocks        # http://localhost:3005 con MSW
```

Códigos para probar con los mocks: la botella `664T-WFDA` (n.º 1 del «Singani Gran Reserva 2026», expediente cerrado), `7T6B-ZK39` (código anulado), el lote `CVJ-2026-SINGANI-004` y el vino `CVJ-2026-WINE-003` (sin laboratorio, expediente abierto). Los lotes de `PASSPORT_CASES` cubren cada aviso: `CUR-2026-SINGANI-001` (bodega suspendida), `CVJ-2025-SINGANI-001` (lote retirado), `ALT-2025-SINGANI-002` (D.O. por excepción y registro tardío) y `ALT-2025-WINE-001` (laboratorio no conforme); con `?mock=pasaporte-saturado` el visor recibe el 429 del límite por minuto. Hay más en `publicFixtures.bottleCodes` de `@drinks-on-chain/mocks/fixtures`.

| Script                                     | Qué hace                                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm dev:mocks`              | Servidor de desarrollo sin / con MSW (puerto 3005)                                             |
| `pnpm lint`, `pnpm typecheck`, `pnpm test` | Calidad (el typecheck genera antes los tipos de rutas de Next)                                 |
| `pnpm e2e`                                 | Playwright contra un build de producción con mocks, en el puerto 3105 (en local usa tu Chrome) |
| `pnpm format`                              | Prettier                                                                                       |
| `node scripts/generate-icons.mjs`          | Regenera los iconos provisionales de la PWA                                                    |

## Variables de entorno

| Variable                  | Uso                                                                                                                                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `API_ORIGIN`              | **Solo servidor.** Origen del backend: `src/proxy.ts` reescribe `/api/v1/*` a `${API_ORIGIN}/v1/*`. Obligatoria sin mocks, también **en el build**. Desarrollo: `https://136.243.223.39.sslip.io`                             |
| `PROXY_SHARED_SECRET`     | **Solo servidor, nunca `NEXT_PUBLIC_`.** Firma la IP del visitante para el backend: el mismo valor que en el backend del entorno. Sin ella, el límite de peticiones del pasaporte público contaría por la IP de la plataforma |
| `NEXT_PUBLIC_MOCKS`       | `1` arranca MSW (intercepta `/api/v1/*` en el navegador) y habilita `/__mocks`; con `1` no hace falta `API_ORIGIN` y **nada se indexa** (son datos de demostración)                                                           |
| `NEXT_PUBLIC_URL_APP`     | Origen público de este sitio, sin barra final (URL canónicas y metadatos). Coincide con `PASSPORT_BASE_URL` del backend, que es la URL que llevan los QR                                                                      |
| `NEXT_PUBLIC_URL_LANDING` | Landing principal: enlace del pie y destino de "Avísame" (`{landing}/lista-de-espera?src=marketplace`). Vacía = "Avísame" no aparece                                                                                          |
| `NEXT_PUBLIC_URL_BODEGAS` | Sitio de las bodegas (enlace del pie); vacía = no se muestra                                                                                                                                                                  |

### Con el backend real (`NEXT_PUBLIC_MOCKS=0`)

Las pantallas no cambian; lo que cambia es lo que el backend ya publica:

- **Bodegas** (`/v1/public/wineries`): funciona hoy contra el backend de desarrollo.
- **Pasaporte**: funciona contra el backend de desarrollo, con los esquemas de `@drinks-on-chain/mocks` 0.5.0-rc.2 **sin tolerancias** (comprobado el 02-10-2026 con los lotes `CVJ-2026-SINGANI-002`, `-004` y `-005`: el pasaporte pasa `PublicCodePassportSchema`, el expediente canónico pasa `CanonicalDossierSchema` y su huella coincide). El **lote** se pide en el servidor (ver más abajo); la botella, en el navegador. Una respuesta que no cumple el contrato es un error ("No pudimos consultar el código"), no un pasaporte a medias. Recorrido contra el backend real: `E2E_REAL_API=1 E2E_API_ORIGIN=… pnpm e2e` (`e2e/backend-real.spec.ts`; con `E2E_BOTTLE_CODE` comprueba también una botella).
- **Catálogo** (`/v1/public/collections`): no existe en el backend (404). La portada y `/catalogo` dicen "próximamente" y la página de bodega no enseña colecciones; no se muestra ningún error.

## Visor `/b/{código}` (2E)

- **Código de botella** (contrato de la Ola 2 §7.1): 8 caracteres del alfabeto Crockford (sin I, L, O, U), 7 de carga + 1 de control Luhn mod 32. Se imprime `664T-WFDA` y viaja en la URL sin guion. Al leerlo se pasa a mayúsculas, se quitan espacios y guiones y se resuelven las confusiones `O → 0` e `I`/`L → 1`.
- **Código de lote** (§6.3): `{prefijo}-{año}-{WINE|SINGANI}-{NNN}`, p. ej. `CVJ-2026-SINGANI-004`.
- **Una sola fuente**: el alfabeto, el control, la normalización, el formato y `LOT_CODE_PATTERN` salen de `@drinks-on-chain/mocks` (que porta el cálculo del backend). Aquí solo vive lo propio del visor: `parseCode(texto)` (`src/lib/codes/parse.ts`), que devuelve `{ kind: "bottle" | "lot", code, formatted }` o `{ kind: "malformed", reason, length, suggestion }` (motivos `empty`, `too-short`, `too-long`, `characters`, `check`), acepta guiones tipográficos y la URL del QR pegada entera, y la **sugerencia** (`suggest.ts`), que solo aparece cuando hay una única corrección probable y se ofrece como pregunta.
- `/b/[code]` valida en el servidor: un código bien escrito pero no canónico (`/b/664t-wfda`) redirige con 308 a `/b/664TWFDA`; uno mal escrito abre el formulario con el motivo.
- Los datos llegan por `usePassport(code)` (`src/lib/passport/hooks.ts`): `{ state, retry, retrying }` con `state.status` en `loading`, `found`, `not-found` (404 `PUB_CODE_NOT_FOUND`), `malformed` (422 `PUB_CODE_MALFORMED`), `rate-limited` (429, con `retryAfter`), `offline` o `error`. Solo se reintenta sola una caída de red: cada consulta cuenta para el límite por IP.
- **El pasaporte** (`PassportDocument`, contrato §12.5):
  - Botella: "Botella n.º N de M" con su código; **aviso si el código está anulado**. Lote: "Esta etiqueta identifica el lote". De la botella se pasa al lote (`/b/{lote}?desde={código}`) y del lote se vuelve a la botella.
  - Avisos de **lote retirado** y de **bodega no activa** (la bodega deja de enlazarse).
  - Cabecera con nombre, tipo, añada y bodega; **expediente** (cerrado con su huella abreviada, o abierto), "Anclaje en la red: pendiente" y **descarga del expediente canónico** (JSON).
  - Origen y Denominación de Origen con las reglas usadas y la excepción legal; elaboración con cada etapa **aplicable** (la que no aplica al producto no aparece); registro del lote con `JourneyTimeline` (el **rol** de quien registró, nunca su nombre; registros tardíos y corregidos); laboratorio con cada parámetro frente a su límite y unidad; reglas de la instantánea; documentos públicos.
  - **Solo datos registrados**: donde el pasaporte trae `null` o `NOT_RECORDED` se escribe "No registrado". No hay reseñas, precio ni NFT.
- **Comprobación de la botella** (`src/lib/passport/verify.ts`): si el pasaporte trae la prueba Merkle (`{ salt, path }`, **sin la raíz**), el navegador descarga el expediente canónico, recalcula su huella (`sha256Hex`), lee la raíz de `bottleCodes.merkleRoot` (`CanonicalDossierSchema`) y comprueba la prueba con `merkleLeaf` y `verifyMerkleProof` de los mocks (el padre es el SHA-256 de los **bytes** de los dos hijos, como en el backend). Si todo cuadra: "Este código pertenece al expediente cerrado". Si el expediente sigue abierto, se explica que la comprobación llegará al cerrarlo.
- **Rutas que llegan en los datos** (`dossier.canonicalUrl`, `publicAttachments[].url`): se aceptan como ruta (`/v1/…`) o como URL absoluta (cuando el backend defina `API_PUBLIC_URL`) y se piden siempre por el proxy del propio origen (`src/lib/api/paths.ts`).

### El lote se pinta en el servidor

Con backend (`NEXT_PUBLIC_MOCKS` ≠ 1), `/b/{lotCode}` pide el pasaporte **en el servidor** (`src/lib/passport/server.ts`, contrato §12.4):

- **Qué va en el HTML inicial**: el pasaporte entero (cabecera, expediente, origen, elaboración, registro, laboratorio, reglas), legible sin JavaScript. Al hidratar no se vuelve a pedir nada. Los metadatos salen del lote (`src/lib/passport/metadata.ts`): título, descripción, URL canónica, Open Graph y `robots: index, follow`.
- **IP de quien visita**: el freno a la enumeración y el límite por minuto del backend son por IP real. Cada petición del servidor lleva las cabeceras `X-DOC-Client-IP`, `X-DOC-Proxy-Timestamp` y `X-DOC-Proxy-Signature` con la IP del visitante firmada (`signedClientHeaders` de `src/lib/api-proxy.ts`, lo mismo que hace `src/proxy.ts`). Nunca cuentan todas las visitas contra la IP del servidor.
- **Caché**: la del `Cache-Control` del backend, 60 s y 3600 s con el lote certificado, **por código de lote**. No es la caché de `fetch` (su clave incluye las cabeceras, y las de la firma cambian en cada visita) sino `unstable_cache`, cuya clave es solo el código; la identidad del visitante viaja aparte, en un `AsyncLocalStorage`, hasta la petición que de verdad sale. Solo se guardan respuestas correctas: un 404, un 429 o un fallo no se guardan, así que el freno de una persona no afecta a otra.
- **Estados**: un lote que no existe responde **404** de verdad con el aviso del visor (`not-found.tsx`) y una sola etiqueta `robots` (`noindex`); un 429 o un fallo pintan su estado y "Reintentar" vuelve a pedir la página al servidor.
- **Mejora pendiente (no implementada): 304 con `ETag`.** El backend responde el pasaporte con `ETag` y acepta `If-None-Match` (304 sin cuerpo). El visor no lo aprovecha: el servidor guarda la respuesta el tiempo del `Cache-Control` y, pasado ese tiempo, vuelve a pedirla entera. Guardar el `ETag` junto al pasaporte y revalidar con `If-None-Match` ahorraría el cuerpo cuando el lote no cambió (lo habitual en uno certificado).
- **Botella**: sigue en el navegador (`usePassport`, por el proxy firmado) y nunca se indexa. Con `NEXT_PUBLIC_MOCKS=1` no hay backend en el servidor (MSW vive en el navegador), así que todo va por el camino del navegador y nada se indexa.

## Catálogo (2A) · la API es un BORRADOR

`GET /v1/public/collections` y `/{slug}` **no están en el OpenAPI del backend**: son el borrador del contrato de la Ola 2 §17.1, que fijará el OpenAPI de la Etapa 4 (O3-PK-1) y **puede cambiar sin aviso**. Hoy solo los sirven los mocks (cabecera `X-Mock-Draft`), con precios y disponibilidad de ejemplo. Todo lo que depende de esa forma está en `src/lib/catalog/` y marcado `[BORRADOR §17.1]`.

- `/catalogo`: lista con filtros **en la URL** (`?tipo=vino|singani&estado=preventa|a-la-venta|agotado&bodega={slug}&q=…&pagina=N`), paginación y estados cargando, vacío, sin coincidencias y error.
- `/catalogo/[slug]`: ficha con precio que **puede faltar** ("Precio por anunciar", A-32), disponibilidad, estado (`PRESALE`, `ON_SALE`, `SOLD_OUT`), estado y línea de tiempo del lote, y enlace a su pasaporte si ya está embotellado.
- **Sin compra ni cuenta**: la llamada a la acción es "Avísame", un enlace a la lista de espera de la landing (`links.waitlist`).
- La portada pide las **destacadas** (`?featured=true`) y el catálogo ofrece el **orden** del borrador (`?orden=recientes|precio-menor|precio-mayor|nombre`; por defecto, destacadas primero): nada se ordena en el cliente.
- Imágenes y logotipos de los datos: `DataImage` los pinta cuando existen y cae a la botella a tinta o al monograma si faltan o fallan. Las rutas `/mocks/uploads/…` solo existen con MSW activo (los handlers las sirven); sin mocks se tratan como "sin imagen" (`usableImageUrl`).

## PWA

Manifest generado por `src/app/manifest.ts` (`/manifest.webmanifest`): `standalone`, colores de papel, iconos de 192 y 512 px, uno adaptable y el de iOS (`src/app/apple-icon.png`). Los iconos son **provisionales** (la marca en texto, "DoC"). **No hay service worker propio**: los navegadores ya no lo exigen para instalar y, con `NEXT_PUBLIC_MOCKS=1`, el ámbito raíz lo ocupa el de MSW. El modo sin conexión de la cava es de la Ola 4 (2F).

## Proxy de la API

El navegador llama a `/api/v1/*` de su propio origen y `src/proxy.ts` (`src/lib/api-proxy.ts`) lo reescribe a `${API_ORIGIN}/v1/*` sin tocar método, cuerpo, cookies ni respuesta (`Retry-After` incluido). Con `PROXY_SHARED_SECRET` añade `X-DOC-Client-IP`, `X-DOC-Proxy-Timestamp` y `X-DOC-Proxy-Signature` (HMAC-SHA256 de `MÉTODO|RUTA_CON_QUERY|IP|TIMESTAMP`): el backend limita las consultas del pasaporte por la IP real de quien visita (contrato §12.4). Todas las peticiones llevan `X-Client-App: MARKETPLACE`.

## Convenciones

Trabajo en `dev`, PR `dev → main` al cerrar la ola, Conventional Commits en español. Detalle en `CLAUDE.md`.

## Actualizar los paquetes compartidos

`@drinks-on-chain/ui` y `@drinks-on-chain/mocks` se instalan desde el tarball de su GitHub Release:

```bash
pnpm add https://github.com/drinks-on-chain/drinks-on-chain-design-system/releases/download/vX.Y.Z/drinks-on-chain-ui-X.Y.Z.tgz
pnpm add https://github.com/drinks-on-chain/drinks-on-chain-mocks/releases/download/vX.Y.Z/drinks-on-chain-mocks-X.Y.Z.tgz
pnpm exec msw init public --save   # si cambió msw
```

Las mejoras de la plantilla llegan con `git fetch template && git merge template/dev`.
