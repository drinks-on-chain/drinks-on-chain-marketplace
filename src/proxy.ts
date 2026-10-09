import { NextResponse, type NextRequest } from "next/server";
import { ACCOUNT_OFF_PATH, accountFlagOn, isAccountPath } from "@/lib/account/routes";
import { proxyApiRequest } from "@/lib/api-proxy";

/**
 * P-1 + O1-OPS-1: `/api/v1/*` se reescribe a `${API_ORIGIN}/v1/*` con la IP del cliente firmada
 * (`src/lib/api-proxy.ts`). Con `NEXT_PUBLIC_MOCKS=1` y sin `API_ORIGIN` no hace nada: MSW
 * responde en el navegador.
 *
 * Bandera de la cuenta (2B) y la compra (2C): con `NEXT_PUBLIC_MK_ACCOUNT` apagada (producción y
 * previews contra el backend real), sus rutas responden el **404** del sitio. Se hace aquí, antes
 * de renderizar, porque `notFound()` dentro de una página con `Suspense` responde 200.
 */
export function proxy(request: NextRequest) {
  if (isAccountPath(request.nextUrl.pathname)) {
    return accountFlagOn() ? NextResponse.next() : NextResponse.rewrite(new URL(ACCOUNT_OFF_PATH, request.url));
  }
  return proxyApiRequest(request);
}

export const config = {
  // Literales: Next lee esta lista al construir (las rutas son las de `ACCOUNT_MATCHERS`).
  matcher: [
    "/api/v1/:path*",
    "/entrar",
    "/crear-cuenta",
    "/recuperar-contrasena",
    "/restablecer-contrasena",
    "/verificar-correo",
    "/cuenta/:path*",
  ],
};
