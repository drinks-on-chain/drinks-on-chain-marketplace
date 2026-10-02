# drinks-on-chain-marketplace

S2 · **Marketplace** del ecosistema **Drinks on Chain** (`app.`): sitio público B2C, móvil primero. Aquí se verifica una botella con el código de su etiqueta (visor `/b/{código}`) y, más adelante, se recorre el catálogo, se compra y se guarda la cava. Nació de [`drinks-on-chain-app-template`](https://github.com/drinks-on-chain/drinks-on-chain-app-template) (remoto `template`). Planificación en `docs/ROADMAP.md` y en [drinks-on-chain-docsfront](https://github.com/BrianKGR01/drinks-on-chain-docsfront) (roadmap 03 §6, bloques 2A–2F).

## Qué hay hoy (Ola 2 · O2-MK-1, fase 1: andamiaje)

| Pieza                                                                                                                                                                              | Dónde                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Next.js 16 (App Router, Turbopack), React 19, TypeScript estricto, Tailwind 4                                                                                                      | —                                                                       |
| `StoreShell` de `@drinks-on-chain/ui`: pestañas inferiores en móvil, cabecera en escritorio, salto al contenido                                                                    | `src/components/store-frame.tsx`, `src/lib/navigation.tsx`              |
| Portada provisional: marca, "Verifica una botella" y catálogo "próximamente"                                                                                                       | `src/app/(store)/page.tsx`                                              |
| Entrada manual del código, accesible (error asociado al campo, foco, sugerencia)                                                                                                   | `src/app/(store)/b/page.tsx`, `src/components/code-entry-form.tsx`      |
| Códigos: normalización y validación del código de botella (Crockford, 8 caracteres, control Luhn mod 32; `O → 0`, `I`/`L → 1`; mayúsculas, guiones, espacios) y del código de lote | `src/lib/codes/`                                                        |
| Visor `/b/[code]` con sus estados (cargando, encontrado, no encontrado, mal escrito, demasiados intentos, sin conexión, error); **sin datos todavía**                              | `src/app/(store)/b/[code]/page.tsx`, `src/components/passport-view.tsx` |
| Datos del visor tras una interfaz: `usePassport()` sobre `GET /v1/public/passports/{code}`                                                                                         | `src/lib/passport/`                                                     |
| `/trace/batch/{lote}` (URL del QR antiguo) → 308 a `/b/{lote}`                                                                                                                     | `next.config.ts`                                                        |
| PWA básica: manifest, `theme-color`, iconos provisionales                                                                                                                          | `src/app/manifest.ts`, `public/icons/`, `scripts/generate-icons.mjs`    |
| Cliente de API tipado contra `/api/v1/*` del propio origen, con el proxy que firma la IP del visitante                                                                             | `src/lib/api/`, `src/proxy.ts`, `src/lib/api-proxy.ts`                  |
| Datos de prueba `@drinks-on-chain/mocks` con MSW en el navegador y panel `/__mocks`                                                                                                | `src/app/providers.tsx` (`MocksGate`), `src/app/%5F%5Fmocks`            |
| Rutas propias y enlaces a los otros sitios (hosts solo por `NEXT_PUBLIC_URL_*`)                                                                                                    | `src/lib/links.ts`                                                      |
| Textos en español                                                                                                                                                                  | `src/lib/i18n/es.ts`                                                    |
| Vitest + Testing Library, Playwright (390 px y 1280 px) con axe, ESLint, Prettier, CI                                                                                              | `vitest.config.mts`, `playwright.config.ts`, `.github/workflows/ci.yml` |

**No hay sesión**: el Marketplace de esta ola no autentica a nadie (la cuenta por correo llega en la Ola 3, bloque 2B). De la plantilla se retiraron el login con roles, la guardia por audiencia, el selector de organización y `src/lib/auth`.

## Empezar

Requisitos: Node 22 (`.nvmrc`) y pnpm 10 (`corepack enable`).

```bash
pnpm install
cp .env.example .env.local
pnpm dev:mocks        # http://localhost:3005 con MSW
```

| Script                                     | Qué hace                                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm dev:mocks`              | Servidor de desarrollo sin / con MSW (puerto 3005)                                             |
| `pnpm lint`, `pnpm typecheck`, `pnpm test` | Calidad (el typecheck genera antes los tipos de rutas de Next)                                 |
| `pnpm e2e`                                 | Playwright contra un build de producción con mocks, en el puerto 3105 (en local usa tu Chrome) |
| `pnpm format`                              | Prettier                                                                                       |
| `node scripts/generate-icons.mjs`          | Regenera los iconos provisionales de la PWA                                                    |

## Variables de entorno

| Variable                                             | Uso                                                                                                                                                                                                                           |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `API_ORIGIN`                                         | **Solo servidor.** Origen del backend: `src/proxy.ts` reescribe `/api/v1/*` a `${API_ORIGIN}/v1/*`. Obligatoria sin mocks, también **en el build**. Desarrollo: `https://136.243.223.39.sslip.io`                             |
| `PROXY_SHARED_SECRET`                                | **Solo servidor, nunca `NEXT_PUBLIC_`.** Firma la IP del visitante para el backend: el mismo valor que en el backend del entorno. Sin ella, el límite de peticiones del pasaporte público contaría por la IP de la plataforma |
| `NEXT_PUBLIC_MOCKS`                                  | `1` arranca MSW (intercepta `/api/v1/*` en el navegador) y habilita `/__mocks`. Con `1` no hace falta `API_ORIGIN`                                                                                                            |
| `NEXT_PUBLIC_URL_APP`                                | Origen público de este sitio, sin barra final (URL canónicas y metadatos). Coincide con `PASSPORT_BASE_URL` del backend, que es la URL que llevan los QR                                                                      |
| `NEXT_PUBLIC_URL_LANDING`, `NEXT_PUBLIC_URL_BODEGAS` | Enlaces del pie a la landing y al sitio de las bodegas; vacías = el enlace no se muestra. Nunca se escriben hosts en componentes                                                                                              |

Cambiar de mocks a backend real: `NEXT_PUBLIC_MOCKS=0` y `API_ORIGIN` al servidor. Las pantallas no cambian.

## Códigos y visor

- **Código de botella** (contrato de la Ola 2 §7.1): 8 caracteres del alfabeto Crockford (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`, sin I, L, O, U), 7 aleatorios + 1 de control Luhn mod 32. Se imprime `K7M2-Q9XM` y viaja en la URL sin guion. Al leerlo se pasa a mayúsculas, se quitan espacios y guiones y se resuelven las confusiones `O → 0` e `I`/`L → 1`.
- **Código de lote** (§6.3): `{prefijo}-{año}-{WINE|SINGANI}-{NNN}`, p. ej. `CVJ-2026-SINGANI-004`. Aquí solo se reconoce la forma; que exista lo dice el pasaporte.
- `parseCode(texto)` (`src/lib/codes/parse.ts`) devuelve `{ kind: "bottle" | "lot", code, formatted }` o `{ kind: "malformed", reason, length, suggestion }`. Los motivos son `empty`, `too-short`, `too-long`, `characters` y `check`. La **sugerencia** aparece solo cuando hay una única corrección probable (un carácter parecido: `2`/`Z`, `5`/`S`, `8`/`B`, `0`/`D`/`Q`…, o dos vecinos intercambiados); es una conjetura y se ofrece como pregunta. También acepta la URL del QR pegada entera.
- `/b/[code]` valida en el servidor: un código bien escrito pero no canónico (`/b/k7m2-q9xm`) redirige con 308 a `/b/K7M2Q9XM`; uno mal escrito abre el formulario con el motivo. El visor no se indexa.
- Los datos llegan por `usePassport(code)` (`src/lib/passport/hooks.ts`), que devuelve `{ state, retry, retrying }` con `state.status` en `loading`, `found`, `not-found` (404 `PUB_CODE_NOT_FOUND`), `malformed` (422 `PUB_CODE_MALFORMED`), `rate-limited` (429, con `retryAfter`), `offline` o `error`. `PassportView` pinta cada estado y se prueba sin red.

### Lo que falta para la fase 2

El pasaporte es `unknown` (`src/lib/passport/types.ts`): no se inventa su forma. Cuando se publique `@drinks-on-chain/mocks` 0.5 con el dominio `public`:

1. `Passport` pasa a ser la unión `PublicBottlePassport | PublicLotPassport` de los mocks y `fetchPassport` recibe su esquema zod.
2. El estado `found` de `PassportView` pinta el pasaporte (contrato §12.5).
3. Con los mocks 0.4 no hay ruta `public/passports`: la petición llega al servidor de Next, que responde 404, y el visor muestra "No encontramos este código". Las e2e lo dan por bueno hoy; cambiarán con los datos.

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
