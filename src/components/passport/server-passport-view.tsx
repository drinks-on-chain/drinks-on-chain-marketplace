"use client";

import { useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { parseCode, type ValidCode } from "@/lib/codes/parse";
import type { PassportState } from "@/lib/passport/types";
import { MalformedCodeView, PassportView } from "./passport-view";

/**
 * Visor de un lote cuyo pasaporte ya pidió el servidor (`getLotPassport`): el contenido va en el
 * HTML inicial. "Reintentar" vuelve a pedir la página al servidor, que repite la consulta con la
 * IP de quien visita.
 */
export function ServerPassportView({
  code,
  state,
  fromBottle = null,
}: {
  code: ValidCode;
  /** Estado que resolvió el servidor (nunca `loading`: llega resuelto). */
  state: Exclude<PassportState, { status: "loading" }>;
  fromBottle?: string | null;
}) {
  const router = useRouter();
  const [retrying, startTransition] = useTransition();
  return (
    <PassportView
      code={code}
      fromBottle={fromBottle}
      query={{ state, retry: () => startTransition(() => router.refresh()), retrying }}
    />
  );
}

/**
 * "No encontramos este código" para `notFound()` de `/b/[code]` (la respuesta lleva el estado
 * 404 y `noindex`). El límite de `not-found` no recibe los parámetros de la ruta: se leen aquí.
 */
export function PassportNotFound() {
  const params = useParams<{ code?: string }>();
  let raw = params.code ?? "";
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // Se queda como llegó.
  }
  const parsed = parseCode(raw);
  if (parsed.kind === "malformed") return <MalformedCodeView problem={parsed} />;
  return <ServerPassportView code={parsed} state={{ status: "not-found" }} />;
}
