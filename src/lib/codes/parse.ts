import {
  BOTTLE_CODE_LENGTH,
  CROCKFORD_ALPHABET,
  formatBottleCode,
  isValidBottleCode,
  normalizeBottleCode,
  suggestBottleCode,
} from "./bottle-code";
import { isLotCodeShape, normalizeLotCode } from "./lot-code";

// Lo que alguien escribe, pega o trae en la URL del visor (`/b/{código}`) → botella, lote o
// "mal escrito". Módulo puro: lo usan el servidor (la página), el formulario y las pruebas.

/** Por qué un texto no es un código (siempre respecto al código de botella de 8 caracteres). */
export type MalformedReason =
  /** No se escribió nada. */
  | "empty"
  /** Menos de 8 caracteres. */
  | "too-short"
  /** Más de 8 caracteres (y sin forma de código de lote). */
  | "too-long"
  /** Signos o letras que el código no usa (p. ej. la `U`). */
  | "characters"
  /** 8 caracteres válidos, pero el de control no cuadra: hay alguno cambiado. */
  | "check";

export type BottleCode = {
  kind: "bottle";
  /** Canónico, sin guion: el de la URL y el de la API (`K7M2Q9XM`). */
  code: string;
  /** Como en la etiqueta (`K7M2-Q9XM`). */
  formatted: string;
};

export type LotCode = {
  kind: "lot";
  /** Canónico, en mayúsculas (`CVJ-2026-SINGANI-004`). */
  code: string;
  formatted: string;
};

export type MalformedCode = {
  kind: "malformed";
  /** Lo que se escribió, sin espacios alrededor. */
  input: string;
  reason: MalformedReason;
  /** Caracteres contados (letras y números), para los mensajes de longitud. */
  length: number;
  /** Código de botella válido más probable (canónico), si hay uno solo. */
  suggestion: string | null;
};

export type ValidCode = BottleCode | LotCode;
export type ParsedCode = ValidCode | MalformedCode;

/** Si se pegó la URL del QR (`…/b/{código}` o la antigua `…/trace/batch/{lote}`), saca el código. */
function fromPastedUrl(input: string): string {
  const match = /\/(?:b|trace\/batch)\/([^/?#\s]+)/i.exec(input);
  if (!match) return input;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/** Clasifica un texto como código de botella, código de lote o mal escrito (con sugerencia). */
export function parseCode(raw: string): ParsedCode {
  const input = fromPastedUrl(raw.trim()).trim();
  if (input === "") return { kind: "malformed", input, reason: "empty", length: 0, suggestion: null };

  const lot = normalizeLotCode(input);
  if (isLotCodeShape(lot)) return { kind: "lot", code: lot, formatted: lot };

  const bottle = normalizeBottleCode(input);
  if (isValidBottleCode(bottle)) return { kind: "bottle", code: bottle, formatted: formatBottleCode(bottle) };

  const length = bottle.replace(/[^0-9A-Z]/g, "").length;
  return { kind: "malformed", input, reason: reasonOf(bottle), length, suggestion: suggestBottleCode(bottle) };
}

function reasonOf(normalized: string): MalformedReason {
  if (/[^0-9A-Z]/.test(normalized)) return "characters";
  if (normalized.length < BOTTLE_CODE_LENGTH) return "too-short";
  if (normalized.length > BOTTLE_CODE_LENGTH) return "too-long";
  if ([...normalized].some((c) => !CROCKFORD_ALPHABET.includes(c))) return "characters";
  return "check";
}
