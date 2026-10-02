# Roadmap del Marketplace (S2)

Sub-etapas 2A–2F de `docs-front/03-roadmap-frontend.md` v3 §6, ordenadas por las olas del plan maestro. Contrato de la ola en curso: `plan/contratos/o2-erp-confiable.md` (§7.1 códigos de botella, §12 pasaporte público, §17 lo que construye cada app). Se marca `- [x] … · fecha` al terminar cada paso.

| Sub-etapa                | Ola                                      | Qué                                                                                                                                               |
| ------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2A Catálogo sin cuenta   | 2 (mocks) · 4 (real)                     | Escaparate, ficha de producto, historia de la bodega, página de bodega, búsqueda y filtros; el precio puede faltar (A-32)                         |
| 2B Cuenta por correo     | 3 (mocks) · 4 (real)                     | Registro y entrada solo con correo (A-13), captcha, verificación, recuperar contraseña, perfil con la dirección informativa de solo lectura       |
| 2C Compra                | 3 (mocks) · 4 (real)                     | `CheckoutSheet`, pago con `PaymentProvider` de prueba, aviso de "pago recibido" (A-23), historial de pedidos                                      |
| 2D Cava y pase de canje  | 4 (cava) · 5 (pase)                      | Mi Cava con un NFT por botella, línea de tiempo del lote, puntos de canje, pase con QR y caducidad                                                |
| 2E Visor público         | 2 (visor) · 4 (reseñas) · 5 (post-canje) | `/b/{código}` resuelve botella o lote sin cuenta (A-21): pasaporte real, huella del expediente, reseñas, vista post-canje, escáner con cámara     |
| 2F Transversal y calidad | 4 · 5 (ayuda)                            | Notificaciones por correo, ayuda, PWA (manifest, iconos, `safe-area`, sin conexión en la cava), Lighthouse móvil ≥ 90, Playwright del flujo María |

## Ola 2 · ERP completo y trazabilidad confiable (O2-MK-1) ← en curso

### Fase 1 · Andamiaje

Base del repo:

- [x] Repo `drinks-on-chain/drinks-on-chain-marketplace` desde la plantilla con su historial (remoto `template`), ramas `main` y `dev` · 2026-10-01
- [x] Paquete `drinks-on-chain-marketplace`, puerto 3005, e2e en 3105, `README.md`, `CLAUDE.md`, `.env.example` · 2026-10-01
- [x] `X-Client-App: MARKETPLACE` en todas las peticiones · 2026-10-01
- [x] `src/lib/links.ts`: rutas propias y hosts de los otros sitios solo por `NEXT_PUBLIC_URL_*` · 2026-10-01
- [x] CI heredada de la plantilla (lint, tipos, pruebas, build y e2e) · 2026-10-01
- [x] Sin sesión: retirados el login con roles, la guardia por audiencia, el selector de organización, la página de ejemplo y `src/lib/auth`; se mantienen el cliente de API, el proxy `/api/v1` firmado y `NEXT_PUBLIC_MOCKS` · 2026-10-01
- [ ] Proyecto de Vercel (lo crea la coordinación), `NEXT_PUBLIC_URL_APP` real en los otros sitios y `PASSPORT_BASE_URL` del backend apuntando a él
- [ ] Configuración `attach`/`dev` del puerto 3005 en `.claude/launch.json` de la carpeta paraguas (coordinación)

Shell y portada:

- [x] `StoreShell` de `@drinks-on-chain/ui` 0.3.1 con pestañas inferiores en móvil (Inicio, Verificar, Catálogo), cabecera en escritorio y salto al contenido · 2026-10-01
- [x] Portada provisional: marca, "Verifica una botella" con entrada manual y catálogo "próximamente" · 2026-10-01
- [x] `/catalogo` con el aviso "próximamente" (lo sustituye 2A) · 2026-10-01
- [x] Página de no encontrado y de error dentro del shell · 2026-10-01

2E · Visor, sin datos todavía:

- [x] `src/lib/codes`: código de botella (alfabeto Crockford, 8 caracteres, control Luhn mod 32, `O → 0`, `I`/`L → 1`, mayúsculas, guiones y espacios) y forma del código de lote, con el algoritmo del backend y pruebas unitarias · 2026-10-01
- [x] `parseCode()`: botella, lote o "mal escrito" con motivo, caracteres contados y sugerencia cuando hay una sola corrección probable · 2026-10-01
- [x] Formulario de entrada manual accesible: error asociado al campo, foco de vuelta al campo, sugerencia, Intro para enviar · 2026-10-01
- [x] `/b` (entrada manual) y `/b/[code]` (botella o lote): validación en el servidor y redirección 308 a la forma canónica · 2026-10-01
- [x] Estados del visor: cargando (esqueleto), encontrado (provisional), no encontrado, mal escrito, demasiados intentos (con la espera de `Retry-After`), sin conexión y error con reintento · 2026-10-01
- [x] Datos tras una interfaz: `usePassport()` sobre `GET /v1/public/passports/{code}` con el pasaporte como `unknown` · 2026-10-01
- [x] `/trace/batch/[lotCode]` → 308 a `/b/[lotCode]` · 2026-10-01
- [x] El visor no se indexa (`noindex`) · 2026-10-01

2F · Adelantado en esta ola:

- [x] PWA básica: manifest, `theme-color`, iconos provisionales (192, 512, adaptable, iOS) con la marca en texto; sin service worker propio · 2026-10-01
- [x] Pruebas unitarias (códigos, enlaces, estados del visor, formulario, errores del pasaporte) · 2026-10-01
- [x] E2E con mocks a 390 px y 1280 px: portada, shell, entrada válida y mal escrita, redirecciones, PWA, axe sin violaciones serias y recorrido por teclado · 2026-10-01

### Fase 2 · Visor contra el pasaporte y catálogo

Contra `@drinks-on-chain/mocks` 0.5.0-rc.1 (dominio `public` y borrador del catálogo).

2E · Visor contra el pasaporte:

- [x] `@drinks-on-chain/mocks` 0.5.0-rc.1: `Passport` = `PublicCodePassport` (botella o lote), validado con zod en `fetchPassport` · 2026-10-02
- [x] Una sola fuente para las reglas del código (alfabeto, control, normalización, formato, `LOT_CODE_PATTERN`): las de los mocks; aquí quedan `parseCode()` y la sugerencia · 2026-10-01
- [x] Botella: "Botella n.º N de M" con su código y aviso de código anulado. Lote: "Esta etiqueta identifica el lote". Enlace de la botella al lote y vuelta (`?desde=`) · 2026-10-02
- [x] Avisos de lote retirado y de bodega no activa (sin enlace a su página) · 2026-10-02
- [x] Cabecera (nombre, tipo, añada, bodega con enlace), expediente cerrado con su huella abreviada o abierto, "Anclaje en la red: pendiente" · 2026-10-02
- [x] Comprobación de la botella en el navegador: prueba Merkle (`merkleLeaf`, `merkleRootFromProof`) contra la raíz del expediente canónico y su huella SHA-256 → "Este código pertenece al expediente cerrado" · 2026-10-02
- [x] Origen (parcelas, altitud, variedad) y D.O. con las reglas usadas y la excepción legal · 2026-10-02
- [x] Elaboración: cada etapa aplicable con sus datos o "No registrado"; la que no aplica al producto no aparece · 2026-10-02
- [x] Registro del lote con `JourneyTimeline`: eventos públicos, rol de quien registró (nunca el nombre), registros tardíos, corregidos y "N correcciones registradas" · 2026-10-02
- [x] Laboratorio (conforme, no conforme, incompleto, no registrado; cada parámetro frente a su límite y unidad) · 2026-10-02
- [x] Reglas del lote (instantánea, con la excepción legal), documentos públicos y "Descargar expediente" (JSON canónico) · 2026-10-02
- [x] Solo datos registrados: `null` y `NOT_RECORDED` se escriben "No registrado"; sin reseñas, precio ni NFT · 2026-10-02
- [x] SEO: la botella nunca se indexa; el lote, la bodega, el catálogo y la portada sí (salvo con `NEXT_PUBLIC_MOCKS=1`) · 2026-10-02
- [x] Pasaporte de lote contra el backend de desarrollo con `NEXT_PUBLIC_MOCKS=0` · 2026-10-02

### Fase 3 · Mocks 0.5.0-rc.2, backend real y lote en el servidor

- [x] `@drinks-on-chain/mocks` 0.5.0-rc.2 **sin tolerancias locales**: fechas de la fermentación como instantes; prueba Merkle con `verifyMerkleProof`, `sha256Hex` y `CanonicalDossierSchema` (padre sobre bytes, raíz en `bottleCodes.merkleRoot` del expediente) · 2026-10-02
- [x] `canonicalUrl` y las URL de los adjuntos, como ruta o como URL absoluta, siempre por el proxy propio (`src/lib/api/paths.ts`) · 2026-10-02
- [x] Catálogo borrador de rc.2: la portada pide `featured` y el catálogo ofrece `?orden=`; imágenes y logotipos con `DataImage`; panel `/__mocks` con `SCENARIO_DESCRIPTIONS` · 2026-10-02
- [x] E2E de cada aviso con `PASSPORT_CASES`: bodega suspendida, lote retirado (y sus botellas anuladas), D.O. por excepción, registro tardío, laboratorio no conforme y límite por minuto (`pasaporte-saturado`) · 2026-10-02
- [x] **Pasaporte del lote en el servidor** (contrato §12.4): contenido en el HTML inicial, metadatos y Open Graph del lote, IP del visitante firmada en cada petición, caché por código de lote (60 s; 3600 s certificado), 404 real para un lote inexistente (`src/lib/passport/server.ts`) · 2026-10-02
- [x] Contra el backend de desarrollo, sin tolerancias: lotes `CVJ-2026-SINGANI-002` (abierto), `-004` y `-005` (certificados, con el expediente canónico y su huella); `e2e/backend-real.spec.ts` (`E2E_REAL_API=1`) · 2026-10-02
- [ ] Pasaporte de **botella** contra el backend real: hace falta un código real (`E2E_BOTTLE_CODE`); lo cubre el recorrido `h2-pasaporte` del repo `drinks-on-chain-e2e`
- [ ] Probar el servidor con mocks: hoy el camino del servidor solo se ejercita contra el backend real (con `NEXT_PUBLIC_MOCKS=1` todo va por el navegador)
- [ ] **Mejora: 304 con `ETag`.** El backend responde el pasaporte con `ETag` y acepta `If-None-Match` (304 sin cuerpo); el visor no lo usa. En el servidor (`src/lib/passport/server.ts`) habría que guardar el `ETag` junto al pasaporte y, al caducar la caché, revalidar con `If-None-Match` en vez de pedir el cuerpo entero; en el navegador (botellas), lo mismo con la caché de TanStack Query. Sin implementar a propósito: no cambia lo que se ve

### Cierre · Mocks 0.5.0-rc.3

- [x] `@drinks-on-chain/mocks` 0.5.0-rc.3 (candidata a estable de la ola; sin el grafo legado ni `LotView`, que el Marketplace no usaba): ningún esquema del visor cambia; los fixtures sí (huella del expediente de `CVJ-2026-SINGANI-004`, crianza mínima de Altos) y las pruebas no dependen de sus valores · 2026-10-02
- [x] Una sola etiqueta `robots` por página: el 404 de un lote solo lleva `noindex` (el layout ya no declara `index, follow`; sin etiqueta la página es indexable) · 2026-10-02

Bodegas:

- [x] `/bodegas` (directorio, `GET /v1/public/wineries`) y `/bodegas/[slug]` (perfil, historia, sitio web y sus colecciones) · 2026-10-02

2A · Catálogo sin cuenta (contra el **BORRADOR** `/v1/public/collections`, contrato §17.1: puede cambiar):

- [x] `/catalogo`: lista con filtros en la URL (tipo, estado, bodega, búsqueda), paginación y estados cargando, vacío, sin coincidencias y error · 2026-10-02
- [x] `/catalogo/[slug]`: precio que puede faltar ("Precio por anunciar"), disponibilidad, `PRESALE` / `ON_SALE` / `SOLD_OUT`, estado y línea de tiempo del lote, enlace a su pasaporte · 2026-10-02
- [x] Sin compra ni cuenta: "Avísame" → lista de espera de la landing (`{NEXT_PUBLIC_URL_LANDING}/lista-de-espera?src=marketplace`) · 2026-10-02
- [x] Portada con destacados del catálogo y las bodegas; si el catálogo no existe en el entorno (`NEXT_PUBLIC_MOCKS=0`: el backend responde 404), "próximamente" · 2026-10-02
- [ ] Rehacer contra el OpenAPI borrador de la Etapa 4 (O3-PK-1) cuando lo fije
- [ ] Fotografías reales de las colecciones (los datos de demostración no traen ninguna que se pueda servir)

Calidad:

- [x] Pruebas unitarias del pasaporte, del catálogo y de las piezas de tienda, y de integración de la capa de datos contra los handlers de los mocks (esquemas, 404, 422, 429, prueba Merkle) · 2026-10-02
- [x] E2E a 390 px y 1280 px: botella verificada, lote, código anulado, "No registrado", descarga del expediente, no encontrado, **demasiados intentos**, catálogo con filtros, ficha, bodegas, axe sin violaciones serias en cada pantalla y teclado · 2026-10-02

## Componentes pendientes en `@drinks-on-chain/ui`

Lo que el Marketplace usa o necesitará y hoy no está en el paquete (0.3.1). Se añaden allí, no aquí.

Hechos en local (`src/components/store/`, con la nota "Pendiente de mover a @drinks-on-chain/ui"):

- `JourneyTimeline`: línea de tiempo editorial del lote (fecha, resumen, rol, registro tardío, corregido). `Timeline` del paquete es la versión operativa.
- `BottleCard` + `CollectionArt` + `BottleArt`: tarjeta de colección con fotografía o botella a tinta.
- `PriceTag`: precio en oro para texto, con "Precio por anunciar" cuando falta.
- `CodeInput`: campo de código (mayúsculas a la vista, cifras alineadas, sin autocorrección).
- `NativeSelect`: selector nativo con el aspecto de los campos. Se queda en local hasta que se corrija el `Select` del paquete (ver abajo).
- `DataImage`: imagen de los datos con respaldo (ilustración o monograma) si falta o falla.

Ajustes en componentes que ya existen:

- **`Select` (Radix) con la lista abierta: violación seria de axe `aria-hidden-focus`.** Caso mínimo: una página con cualquier elemento enfocable fuera del selector (un enlace, o el propio shell) y `<Field label="Bodega"><Select value="a" options={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} /></Field>`; se abre la lista (clic o Intro en el `combobox`) y se pasa axe con `wcag2a`/`wcag2aa`. Mientras la lista está abierta, Radix pone `aria-hidden="true"` (`data-aria-hidden`) a los hermanos del portal (aquí, la raíz del `StoreShell` y el enlace "Saltar al contenido") sin quitarles el foco: quedan elementos enfocables dentro de un árbol oculto a los lectores de pantalla. Arreglo posible en `ui`: marcar esos hermanos con `inert` mientras está abierta, o un selector no modal. Mientras tanto, el Marketplace usa `NativeSelect`.
- `StoreShell`: hueco para el **pie** fuera de `<main>` (hoy el pie va dentro del contenido y no es `contentinfo`) y **salto al contenido** propio, como `AppShell`.
- `Field`: el mensaje de error sin `role="alert"`; el formulario lo envuelve a mano para que se anuncie.
- `Pill`: tamaño táctil (≥ 44 px); hoy 32 px, se agranda con clases.
- `Badge`: tamaño pequeño para metadatos en línea.
- `EmptyState` / `ErrorState` en **familia editorial** (títulos y texto en Garamond, sin borde discontinuo) para el visor; y `ErrorState` con icono configurable (sin conexión, demasiados intentos).

Por hacer en sus olas:

- 2E: `TastingCards`, `StarRating`, `ReviewForm`, `CameraScanner` (O4-PK-1).
- 2A: `StickyBuyBar`, `HeroBanner`.
- 2B–2D: `AuthSheet`, `AddressReadOnly`, `CheckoutSheet`, `OrderStatus`, `TokenCard`, `PickupPointPicker`, `ClaimTicket`.

## Backend ↔ `@drinks-on-chain/mocks` 0.5.0-rc.2 y rc.3

Los huecos de la rc.1 quedaron resueltos en la rc.2 (fechas de la fermentación, casos del pasaporte, archivos de `/mocks/uploads`, esquema del expediente canónico, `sha256Hex`, límite por minuto, `featured` y orden del catálogo). Lo que sigue distinto o pendiente, comprobado el 02-10-2026 contra el backend de desarrollo:

- **El pasaporte y el expediente coinciden**: tres lotes reales pasan `PublicCodePassportSchema` y `CanonicalDossierSchema` sin tolerancias, y la huella recalculada coincide con `dossier.hash`.
- **Catálogo**: el backend no tiene `/v1/public/collections` (404); solo existe en los mocks, como borrador.
- **`canonicalUrl` y `publicAttachments[].url`**: hoy llegan como ruta en los dos; el OpenAPI las documenta como URL absolutas y el backend las devolverá así con `API_PUBLIC_URL`. Los mocks siguen con la ruta. El visor acepta las dos formas.
- **Logotipos**: la semilla del backend trae `logoUrl: "/mocks/uploads/logos/…"`, que en el backend nadie sirve (en los mocks sí). Sin mocks se pinta el monograma.
- **Nombre del lote migrado**: en el backend y en los mocks es el propio código de lote (`CVJ-2026-SINGANI-002`), así que el título de su página es el código; el nombre comercial solo existe en la colección del catálogo (borrador).
- **Etiquetas de las reglas y textos de la línea de tiempo**: los pone el backend; el visor los pinta tal cual y las pruebas no dependen de su texto.
- **Documentos públicos y descarga por enlace**: el service worker de MSW no intercepta navegaciones, así que `…/attachments/{id}` (302) no se abre con mocks; el expediente se descarga con `fetch`.
- **Sin caso de botella anulada después del cierre** (conserva su prueba) entre los códigos de muestra: el visor muestra el aviso de anulación y no la da por verificada, pero no hay fixture para probarlo de extremo a extremo.
- **El camino del servidor no se puede probar con mocks**: MSW solo vive en el navegador. Haría falta que los mocks pudieran responder también a las peticiones del servidor de Next (p. ej. un servidor HTTP de los handlers) para cubrirlo en la CI.

## Olas siguientes

- **Ola 3** (O3-MK-1): 2B cuenta por correo y 2C compra, contra los mocks de la Etapa 4.
- **Ola 4** (O4-MK-1): 2A–2C contra el backend real, 2D cava con NFT por botella, reseñas en 2E, 2F transversal (PWA completa, Lighthouse móvil ≥ 90, flujo María).
- **Ola 5**: pase de canje (2D), vista post-canje (2E) y ayuda (2F).
