import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { MalformedCodeView, PassportViewer } from "@/components/passport-view";
import { parseCode } from "@/lib/codes/parse";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";

// Visor público `/b/{código}` (2E, contrato de la Ola 2 §12.5): acepta un código de botella o de
// lote. Aquí se normaliza y valida (§7.1) y se redirige a la forma canónica; los datos los pide
// el cliente con `usePassport()`.

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
  // Los códigos de botella nunca se indexan (§12.5). La página del lote podrá indexarse cuando
  // muestre el pasaporte (fase 2); hasta entonces tampoco.
  const robots = { index: false, follow: false };
  if (parsed.kind === "malformed") return { title: es.passport.malformedTitle, robots };
  const eyebrow = parsed.kind === "bottle" ? es.passport.bottleEyebrow : es.passport.lotEyebrow;
  return { title: `${eyebrow} ${parsed.formatted}`, robots };
}

export default async function PassportPage({ params }: PageProps<"/b/[code]">) {
  const { code } = await params;
  const input = decodeSegment(code);
  const parsed = parseCode(input);

  if (parsed.kind === "malformed") return <MalformedCodeView problem={parsed} />;
  // Una sola URL por código: `k7m2-q9xm`, `K7M2 Q9XM`… → `/b/K7M2Q9XM`.
  if (parsed.code !== input) permanentRedirect(routes.passport(parsed.code));
  return <PassportViewer code={parsed} />;
}
