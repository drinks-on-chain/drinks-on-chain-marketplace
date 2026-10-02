@AGENTS.md

# drinks-on-chain-marketplace

S2 · Marketplace de Drinks on Chain (`app.`): sitio **público** B2C, móvil primero. Nació de `drinks-on-chain-app-template` (remoto `template`; mejoras con `git merge template/dev`). Lee también el `CLAUDE.md` de la carpeta paraguas, `docs/ROADMAP.md`, `docs-front/03` §6 (bloques 2A–2F), `docs-front/05` (sistema de diseño) con la maqueta `docs-front/design-system/02-marketplace.html`, y el contrato de la ola (`plan/contratos/o2-erp-confiable.md` §7.1, §12 y §17).

## Flujo

- Trabajo en `dev`; ramas cortas `feat/o<ola>-<tarea>` integradas en `dev`; PR `dev → main` al cerrar la ola. Conventional Commits en español con `Refs:` y autor `brayan gomez <brayankgr@gmail.com>`.
- Puertas antes de integrar: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` y `pnpm e2e`.
- Puerto local **3005** (`dev`, `dev:mocks`, `start`); las e2e levantan su propio servidor en **3105**. No arranques un segundo `next dev` si el 3005 ya está ocupado.

## Reglas del Marketplace

- **Sitio público**: todo se recorre sin cuenta. En la Ola 2 **no se autentica a nadie** (la cuenta por correo llega en la Ola 3, bloque 2B): no hay login, guardias ni recuperación de sesión al arrancar. Las llamadas a la API van con `auth: false`.
- **Móvil primero**: se diseña a 390 px y se comprueba a 1280 px. Objetivos táctiles ≥ 44 px, `safe-area` respetada, sin desplazamiento horizontal.
- **Shell**: `StoreShell` de `@drinks-on-chain/ui` montado en `src/components/store-frame.tsx` (pestañas inferiores en móvil, cabecera en escritorio). La navegación vive en `src/lib/navigation.tsx`; solo aparecen las secciones que existen.
- **Dos familias**: editorial (Cormorant Garamond + EB Garamond) en portada, catálogo, ficha y visor; operativa (Inter) en formularios, checkout y perfil. Nunca serif dentro de un formulario.
- **Un solo oro**: un botón primario por pantalla. Papel `#fdfcf5`, tinta y `--accent`; texto pequeño en oro con `text-accent-text` (AA).
- **Movimiento**: solo `transform` y `opacity`, y siempre dentro de `motion-safe:` o de `@media (prefers-reduced-motion: no-preference)`.
- **Textos en español**, en `src/lib/i18n/es.ts`; ningún literal de interfaz en los componentes.
- **Accesibilidad**: teclado completo, foco visible, salto al contenido, errores de formulario asociados al campo (`Field` + `aria-describedby`), `aria-live` en los cambios de estado. Axe sin violaciones serias.
- **Nada inventado**: lo que el pasaporte no trae se escribe "No registrado"; sin reseñas, precios ni NFT hasta su ola. No se muestran direcciones ni "wallet"; del expediente, solo su huella abreviada (contrato §12.5).

## Código

- Las pantallas nunca llaman a `fetch` ni conocen URLs: hooks sobre `src/lib/api`, validados con los esquemas de `@drinks-on-chain/mocks`. El navegador llama a `/api/v1/*` del propio origen y `src/proxy.ts` lo reescribe a `API_ORIGIN` con la IP del visitante firmada (`PROXY_SHARED_SECRET`): el límite de peticiones del pasaporte cuenta por esa IP.
- **Códigos** (`src/lib/codes`, módulo puro con pruebas): las reglas del código (alfabeto Crockford, control Luhn mod 32, normalización, formato, `LOT_CODE_PATTERN`) tienen **una sola fuente**, `@drinks-on-chain/mocks`, que porta el cálculo del backend; no se copian aquí. Lo propio del visor es `parseCode()` (botella, lote o "mal escrito" con motivo) y la sugerencia (`suggest.ts`).
- **Visor** (`/b/[code]`): la página normaliza el código en el servidor y redirige a la forma canónica; los datos llegan por `usePassport()` (`src/lib/passport`), que devuelve una unión de estados (`loading`, `found`, `not-found`, `malformed`, `rate-limited`, `offline`, `error`). El pasaporte (`PublicCodePassport` de los mocks, validado con zod) lo pinta `PassportDocument` (`src/components/passport`), que recibe por props la comprobación de la botella y la descarga del expediente para poder probarse sin red. `/trace/batch/[lotCode]` redirige con 308 a `/b/[lotCode]` (`next.config.ts`).
- **Solo datos registrados** (contrato §12.3): `null` y `NOT_RECORDED` se escriben "No registrado" (`orNotRecorded`); una etapa `NOT_APPLICABLE` no se pinta; de las personas solo sale el rol. La comprobación Merkle de la botella vive en `src/lib/passport/verify.ts`.
- **Catálogo = BORRADOR** (`src/lib/catalog`, contrato §17.1): `/v1/public/collections` no está en el OpenAPI del backend y puede cambiar. Todo lo que dependa de su forma se queda en `src/lib/catalog` y `src/components/catalog`, marcado `[BORRADOR §17.1]`. Un 404 o 501 de la lista significa "aún no existe" (`isCatalogUnavailable`): se dice "próximamente", no se muestra un error. Sin compra ni cuenta: la acción es "Avísame" (`links.waitlist`).
- **Componentes de tienda locales** en `src/components/store` con la nota "Pendiente de mover a @drinks-on-chain/ui" (`JourneyTimeline`, `BottleCard`, `PriceTag`, `CodeInput`, `NativeSelect`): al moverlos, se borran de aquí.
- **Imágenes de los datos**: siempre por `usableImageUrl()` (solo `http(s)` o del propio origen; las rutas `/mocks/…` de demostración se tratan como "sin imagen").
- **Indexado**: con `NEXT_PUBLIC_MOCKS=1` nada se indexa; con el backend real, todo salvo los códigos de botella, `/__mocks` y el 404.
- **Rutas y enlaces** en `src/lib/links.ts`: `routes.*` para las propias y `links.*` para los otros sitios, con hosts solo por `NEXT_PUBLIC_URL_*`.
- Cifras y fechas con `src/lib/format.ts` (único `parseDecimal`, es-BO). Listas con `limit` ≤ 100.
- Estados cargando (skeleton, no spinner a pantalla completa), vacío, error con reintento y sin conexión en cada pantalla con datos.
- Componentes de `@drinks-on-chain/ui`; si falta uno reutilizable (ver "Componentes pendientes" en `docs/ROADMAP.md`), se añade allí, no aquí.
- **PWA**: `src/app/manifest.ts` e iconos de `public/icons` (provisionales; se regeneran con `node scripts/generate-icons.mjs`). Sin service worker propio: con mocks el ámbito raíz lo ocupa el de MSW.
- Next.js 16: `params` es una promesa, `proxy` sustituye a `middleware`; consulta `node_modules/next/dist/docs/` antes de usar una API.
