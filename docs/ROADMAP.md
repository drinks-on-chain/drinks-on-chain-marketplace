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
- [ ] Pintar el pasaporte del lote **en el servidor** (hoy los datos se piden en el navegador: el contenido no va en el HTML inicial)
- [ ] Probar contra el backend de desarrollo cuando deje de responder 501 en `/v1/public/passports` (paso 2.10 de su Etapa 2)

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
- `NativeSelect`: selector nativo con el aspecto de los campos. El `Select` del paquete (Radix), con la lista abierta, deja contenido enfocable bajo `aria-hidden` y axe lo señala como violación seria (`aria-hidden-focus`).

Ajustes en componentes que ya existen:

- `StoreShell`: hueco para el **pie** fuera de `<main>` (hoy el pie va dentro del contenido y no es `contentinfo`) y **salto al contenido** propio, como `AppShell`.
- `Field`: el mensaje de error sin `role="alert"`; el formulario lo envuelve a mano para que se anuncie.
- `Pill`: tamaño táctil (≥ 44 px); hoy 32 px, se agranda con clases.
- `Badge`: tamaño pequeño para metadatos en línea.
- `EmptyState` / `ErrorState` en **familia editorial** (títulos y texto en Garamond, sin borde discontinuo) para el visor; y `ErrorState` con icono configurable (sin conexión, demasiados intentos).

Por hacer en sus olas:

- 2E: `TastingCards`, `StarRating`, `ReviewForm`, `CameraScanner` (O4-PK-1).
- 2A: `StickyBuyBar`, `HeroBanner`.
- 2B–2D: `AuthSheet`, `AddressReadOnly`, `CheckoutSheet`, `OrderStatus`, `TokenCard`, `PickupPointPicker`, `ClaimTicket`.

## Huecos de `@drinks-on-chain/mocks` 0.5.0-rc.1 (para la rc.2)

- **Sin casos de bodega no activa ni de lote retirado** en el dominio público: los avisos solo se prueban con datos construidos a mano. Haría falta un escenario de datos (o fixtures) con `winery.active: false` y con `stage: 'DISCARDED'`.
- **Sin lotes con D.O. por excepción legal, laboratorio no conforme o incompleto ni registros tardíos** entre los pasaportes de muestra (el escenario `laboratorio-no-conforme` es del ERP y no deja un lote con `lotCode` distinto en `publicFixtures`).
- **`imageUrl` y `logoUrl` apuntan a `/mocks/uploads/…`, que nadie sirve** (tampoco en la semilla del backend): o se sirve un marcador de posición o deberían llegar `null`. Aquí se tratan como "sin imagen".
- **La raíz Merkle no está en el pasaporte**: para comprobar una botella hay que descargar el expediente canónico y leer `bottleCodes.merkleRoot`, una forma que no tiene esquema exportado. Convendría exportar el esquema del expediente canónico (o añadir `dossier.merkleRoot` al pasaporte) y `sha256Hex`.
- **Documentos públicos y descarga del expediente por enlace**: el service worker de MSW no intercepta navegaciones, así que `…/attachments/{id}` (302) y `…/dossier` no se pueden abrir como enlaces con mocks; el expediente se descarga con `fetch` y el adjunto solo funciona contra el backend real.
- **El límite general de 60 peticiones por minuto no se simula** (solo el de códigos inexistentes).
- **Catálogo (borrador)**: sin orden ni "destacados" (la portada los ordena en el cliente), sin parámetro de orden, y los lotes migrados usan el código de lote como `name` del pasaporte mientras la colección tiene un nombre comercial distinto.
- **`ScenarioName` creció con los escenarios de datos** (`lote-en-reposo`…): un `Record<ScenarioName, string>` de las apps deja de compilar al actualizar; conviene avisarlo en la guía de migración.

## Olas siguientes

- **Ola 3** (O3-MK-1): 2B cuenta por correo y 2C compra, contra los mocks de la Etapa 4.
- **Ola 4** (O4-MK-1): 2A–2C contra el backend real, 2D cava con NFT por botella, reseñas en 2E, 2F transversal (PWA completa, Lighthouse móvil ≥ 90, flujo María).
- **Ola 5**: pase de canje (2D), vista post-canje (2E) y ayuda (2F).
