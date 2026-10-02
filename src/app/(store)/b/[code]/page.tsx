import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { MalformedCodeView, PassportViewer } from "@/components/passport/passport-view";
import { parseCode } from "@/lib/codes/parse";
import { es } from "@/lib/i18n/es";
import { env } from "@/lib/env";
import { FROM_BOTTLE_PARAM, routes } from "@/lib/links";

// Visor público `/b/{código}` (2E, contrato de la Ola 2 §12.5): acepta un código de botella o de
// lote. Aquí se normaliza y valida (§7.1) y se redirige a la forma canónica; los datos los pide
// el cliente con `usePassport()` (el navegador llama por el proxy firmado, así el límite de
// consultas cuenta por la IP de quien visita).

/** El segmento puede llegar codificado (espacios, guiones tipográficos). */
function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export async function generateMetadata({ params }: PageProps<"/b/[code]">): Promise<Metadata> {
  const { code } = await params;
  const parsed = parseCode(decodeSegment(code));
  const noindex = { index: false, follow: false };
  if (parsed.kind === "malformed") return { title: es.passport.malformedTitle, robots: noindex };
  if (parsed.kind === "bottle") {
    // Los códigos de botella nunca se indexan (§12.5, punto 8).
    return { title: `${es.passport.bottleEyebrow} ${parsed.formatted}`, robots: noindex };
  }
  // La página del lote sí puede indexarse (salvo con datos de demostración).
  return {
    title: `${es.passport.lotEyebrow} ${parsed.formatted}`,
    alternates: { canonical: routes.passport(parsed.code) },
    robots: env.mocks ? noindex : { index: true, follow: true },
  };
}

export default async function PassportPage({ params, searchParams }: PageProps<"/b/[code]">) {
  const { code } = await params;
  const input = decodeSegment(code);
  const parsed = parseCode(input);

  if (parsed.kind === "malformed") return <MalformedCodeView problem={parsed} />;
  // Una sola URL por código: `k7m2-q9xm`, `K7M2 Q9XM`… → `/b/K7M2Q9XM`.
  if (parsed.code !== input) permanentRedirect(routes.passport(parsed.code));

  // Al lote se puede llegar desde una botella (`?desde=`): se valida para ofrecer la vuelta.
  const from = (await searchParams)[FROM_BOTTLE_PARAM];
  const bottle = parsed.kind === "lot" && typeof from === "string" ? parseCode(from) : null;
  return <PassportViewer code={parsed} fromBottle={bottle?.kind === "bottle" ? bottle.code : null} />;
}
