import { BOTTLE_CODE_LENGTH, CROCKFORD_ALPHABET, isValidBottleCode } from "@drinks-on-chain/mocks";

// Sugerencia para un código de botella mal escrito. Las reglas del código (alfabeto Crockford,
// 8 caracteres, control Luhn mod 32, normalización: contrato de la Ola 2 §7.1) tienen una sola
// fuente, `@drinks-on-chain/mocks`, que porta el cálculo del backend; aquí solo vive lo que es
// propio del visor.

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
