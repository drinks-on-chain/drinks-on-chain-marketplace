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

Empieza cuando se publique `@drinks-on-chain/mocks` 0.5.0-rc.1 con el dominio `public`.

- [ ] `@drinks-on-chain/mocks` 0.5: `Passport` = `PublicBottlePassport | PublicLotPassport` y esquema zod en `fetchPassport`
- [ ] 2E Botella: "Botella n.º … de …" con el código; aviso de código anulado. Lote: "Esta etiqueta identifica el lote"
- [ ] 2E Cabecera (nombre, tipo, añada, bodega con enlace a su página, estado del expediente y huella)
- [ ] 2E Origen (parcelas, altitud, variedad, D.O. con sus reglas y la excepción legal)
- [ ] 2E Proceso con `JourneyTimeline`: eventos públicos, etapas sin datos como "No registrado", registros tardíos, correcciones
- [ ] 2E Laboratorio (conforme, no conforme, incompleto; cada parámetro frente a su límite y unidad)
- [ ] 2E Reglas del lote y "Descargar expediente" (JSON canónico)
- [ ] 2E La página del lote se puede indexar (pintarla en el servidor); la de botella, nunca
- [ ] 2A Catálogo sin cuenta contra los mocks (§17.1) y página de bodega con `GET /v1/public/wineries/{slug}` real
- [ ] E2E del visor con los datos de los mocks (botella, lote, anulado, 404, 429) y contra el backend de desarrollo

## Componentes pendientes en `@drinks-on-chain/ui`

Lo que el Marketplace necesitará y hoy no está en el paquete (0.3.1). Se añaden allí, no aquí.

- `StoreShell`: hueco para el **pie** fuera de `<main>` (hoy el pie va dentro del contenido y no es `contentinfo`) y **salto al contenido** propio, como `AppShell`.
- `CodeInput` (o variante de `Input`): campo de código con agrupación visual `XXXX-XXXX`, mayúsculas y cifras alineadas; hoy se resuelve con clases sobre `Input`.
- `Field`: el mensaje de error sin `role="alert"`; el formulario lo envuelve a mano para que se anuncie.
- `EmptyState` / `ErrorState` en **familia editorial** (títulos y texto en Garamond, sin borde discontinuo) para el visor; y `ErrorState` con icono configurable (sin conexión, demasiados intentos).
- 2E: `JourneyTimeline`, `TastingCards`, `StarRating`, `ReviewForm`, `CameraScanner` (O4-PK-1).
- 2A: `BottleCard`, `PriceTag`, `StickyBuyBar`, `HeroBanner`.
- 2B–2D: `AuthSheet`, `AddressReadOnly`, `CheckoutSheet`, `OrderStatus`, `TokenCard`, `PickupPointPicker`, `ClaimTicket`.

## Olas siguientes

- **Ola 3** (O3-MK-1): 2B cuenta por correo y 2C compra, contra los mocks de la Etapa 4.
- **Ola 4** (O4-MK-1): 2A–2C contra el backend real, 2D cava con NFT por botella, reseñas en 2E, 2F transversal (PWA completa, Lighthouse móvil ≥ 90, flujo María).
- **Ola 5**: pase de canje (2D), vista post-canje (2E) y ayuda (2F).
