import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { MalformedCodeView, PassportViewer } from "@/components/passport/passport-view";
import { ServerPassportView } from "@/components/passport/server-passport-view";
import { parseCode } from "@/lib/codes/parse";
import { env } from "@/lib/env";
import { es } from "@/lib/i18n/es";
import { FROM_BOTTLE_PARAM, routes } from "@/lib/links";
import { lotMetadata } from "@/lib/passport/metadata";
import { getLotPassport } from "@/lib/passport/server";

// Visor público `/b/{código}` (2E, contrato de la Ola 2 §12.5): acepta un código de botella o de
// lote. Aquí se normaliza y valida (§7.1) y se redirige a la forma canónica.
//
// - **Lote** con backend: el pasaporte se pide **en el servidor** (`getLotPassport`), con la IP
//   de quien visita firmada y la caché del contrato §12.4. El contenido va en el HTML inicial y
//   la página se puede indexar, con sus metadatos.
// - **Botella**: nunca se indexa; sus datos los pide el navegador con `usePassport()` (por el
//   proxy firmado), que además comprueba el código contra el expediente.
// - Con `NEXT_PUBLIC_MOCKS=1` no hay backend en el servidor (MSW vive en el navegador): todo va
//   por el camino del navegador.

/** El segmento puede llegar codificado (espacios, guiones tipográficos). */
function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

const NOINDEX = { index: false, follow: false } as const;

export async function generateMetadata({ params }: PageProps<"/b/[code]">): Promise<Metadata> {
  const { code } = await params;
  const input = decodeSegment(code);
  const parsed = parseCode(input);
  if (parsed.kind === "malformed") return { title: es.passport.malformedTitle, robots: NOINDEX };
  if (parsed.kind === "bottle") {
    // Los códigos de botella nunca se indexan (§12.5, punto 8).
    return { title: `${es.passport.bottleEyebrow} ${parsed.formatted}`, robots: NOINDEX };
  }

  const fallback: Metadata = { title: `${es.passport.lotEyebrow} ${parsed.formatted}`, robots: NOINDEX };
  // Con datos de demostración, o si la URL aún no es la canónica (se va a redirigir), sin más.
  if (env.mocks || parsed.code !== input) return fallback;
  const result = await getLotPassport(parsed.code);
  return result.status === "found" ? lotMetadata(result.passport) : fallback;
}

export default async function PassportPage({ params, searchParams }: PageProps<"/b/[code]">) {
  const { code } = await params;
  const input = decodeSegment(code);
  const parsed = parseCode(input);

  if (parsed.kind === "malformed") return <MalformedCodeView problem={parsed} />;
  // Una sola URL por código: `k7m2-q9xm`, `K7M2 Q9XM`… → `/b/K7M2Q9XM`.
  if (parsed.code !== input) permanentRedirect(routes.passport(parsed.code));

  if (parsed.kind === "bottle") return <PassportViewer code={parsed} />;

  // Al lote se puede llegar desde una botella (`?desde=`): se valida para ofrecer la vuelta.
  const from = (await searchParams)[FROM_BOTTLE_PARAM];
  const bottle = typeof from === "string" ? parseCode(from) : null;
  const fromBottle = bottle?.kind === "bottle" ? bottle.code : null;

  if (env.mocks) return <PassportViewer code={parsed} fromBottle={fromBottle} />;

  const result = await getLotPassport(parsed.code);
  // Un lote que no existe es un 404 de verdad (con el aviso del visor: `not-found.tsx`).
  if (result.status === "not-found") notFound();
  return <ServerPassportView code={parsed} state={result} fromBottle={fromBottle} />;
}
