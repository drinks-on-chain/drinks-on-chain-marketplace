// Códigos de botella (contrato de la Ola 2 §7.1, A-26). Módulo puro, sin dependencias: el mismo
// algoritmo que el backend (`modules/lots/domain/bottle-code.ts`).
//
// 8 caracteres del alfabeto Crockford (sin I, L, O, U): 7 aleatorios + 1 de control Luhn mod 32
// sobre los 7 anteriores (detecta cualquier error de un carácter y casi todas las transposiciones).
// Se imprimen como `XXXX-XXXX` y viajan en la URL sin guion.

export const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const BOTTLE_CODE_LENGTH = 8;

const BASE = CROCKFORD_ALPHABET.length; // 32

/**
 * Normalización al leer (§7.1): mayúsculas, sin espacios ni guiones, `O → 0`, `I`/`L → 1`.
 * También se aceptan los guiones tipográficos que ponen algunos teclados (–, —, ‑).
 */
export function normalizeBottleCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s\-\u2010-\u2015]+/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

/** Carácter de control Luhn mod 32 de `payload` (caracteres del alfabeto). */
export function luhnMod32CheckChar(payload: string): string {
  let factor = 2;
  let sum = 0;
  for (let i = payload.length - 1; i >= 0; i--) {
    const index = CROCKFORD_ALPHABET.indexOf(payload[i]);
    if (index < 0) throw new Error(`Carácter fuera del alfabeto: ${payload[i]}`);
    const addend = factor * index;
    factor = factor === 2 ? 1 : 2;
    sum += Math.floor(addend / BASE) + (addend % BASE);
  }
  return CROCKFORD_ALPHABET[(BASE - (sum % BASE)) % BASE];
}

/** ¿El último carácter es el control Luhn mod 32 de los anteriores? */
export function hasValidCheckChar(code: string): boolean {
  if (code.length === 0) return false;
  let factor = 1;
  let sum = 0;
  for (let i = code.length - 1; i >= 0; i--) {
    const index = CROCKFORD_ALPHABET.indexOf(code[i]);
    if (index < 0) return false;
    const addend = factor * index;
    factor = factor === 2 ? 1 : 2;
    sum += Math.floor(addend / BASE) + (addend % BASE);
  }
  return sum % BASE === 0;
}

/** ¿Es un código de botella con forma y control válidos (ya normalizado)? */
export function isValidBottleCode(normalized: string): boolean {
  return normalized.length === BOTTLE_CODE_LENGTH && hasValidCheckChar(normalized);
}

/** `XXXX-XXXX`, como en la etiqueta. */
export function formatBottleCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

// Caracteres que se confunden al leer una etiqueta pequeña o al teclear. `O`, `I` y `L` no
// aparecen: la normalización ya los convierte.
const LOOK_ALIKE: Record<string, string> = {
  "0": "DQ",
  D: "0",
  Q: "0",
  "1": "7",
  "7": "1",
  "2": "Z",
  Z: "2",
  "5": "S",
  S: "5",
  "6": "G",
  G: "6",
  "8": "B",
  B: "8",
  M: "N",
  N: "M",
  V: "Y",
  Y: "V",
};

/**
 * Sugerencia para un código de 8 caracteres que no pasa el control: se prueba a cambiar un
 * carácter por uno que se le parece y a intercambiar dos vecinos. Solo se sugiere cuando hay
 * **una única** corrección posible; con ninguna o con varias no se adivina (devuelve `null`).
 *
 * Es una conjetura: que el control cuadre no significa que el código exista (un texto al azar
 * recibe sugerencia una de cada cuatro veces). Por eso se ofrece como pregunta y es la persona
 * quien decide; si el código sugerido no existe, el visor lo dirá.
 */
export function suggestBottleCode(normalized: string): string | null {
  // La `U` no existe en el alfabeto: lo más parecido es la `V`. Los signos sueltos se descartan.
  const cleaned = normalized.replace(/[^0-9A-Z]/g, "").replace(/U/g, "V");
  if (cleaned.length !== BOTTLE_CODE_LENGTH) return null;
  if ([...cleaned].some((c) => !CROCKFORD_ALPHABET.includes(c))) return null;
  if (isValidBottleCode(cleaned)) return cleaned === normalized ? null : cleaned;

  const candidates = new Set<string>();
  for (let i = 0; i < cleaned.length; i++) {
    for (const alt of LOOK_ALIKE[cleaned[i]] ?? "") {
      const candidate = cleaned.slice(0, i) + alt + cleaned.slice(i + 1);
      if (isValidBottleCode(candidate)) candidates.add(candidate);
    }
    if (i + 1 < cleaned.length && cleaned[i] !== cleaned[i + 1]) {
      const swapped = cleaned.slice(0, i) + cleaned[i + 1] + cleaned[i] + cleaned.slice(i + 2);
      if (isValidBottleCode(swapped)) candidates.add(swapped);
    }
  }
  return candidates.size === 1 ? [...candidates][0] : null;
}
