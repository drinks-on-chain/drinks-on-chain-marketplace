import { describe, expect, it } from "vitest";
import {
  BOTTLE_CODE_LENGTH,
  CROCKFORD_ALPHABET,
  formatBottleCode,
  hasValidCheckChar,
  isValidBottleCode,
  luhnMod32CheckChar,
  normalizeBottleCode,
  suggestBottleCode,
} from "./bottle-code";

// Vectores calculados con el algoritmo del backend (`modules/lots/domain/bottle-code.ts`):
// carga de 7 caracteres → carácter de control.
const VECTORS: [payload: string, check: string][] = [
  ["K7M2Q9X", "M"],
  ["7M2Q9XA", "0"],
  ["0000000", "0"],
  ["ZZZZZZZ", "7"],
  ["A1B2C3D", "Y"],
  ["4F8K2M0", "E"],
  ["SGR26CN", "7"],
  ["D0Q8B5S", "1"],
  ["1234567", "M"],
];

describe("alfabeto Crockford", () => {
  it("tiene 32 caracteres y no incluye I, L, O ni U", () => {
    expect(CROCKFORD_ALPHABET).toHaveLength(32);
    expect(new Set(CROCKFORD_ALPHABET).size).toBe(32);
    for (const c of "ILOU") expect(CROCKFORD_ALPHABET).not.toContain(c);
  });
});

describe("luhnMod32CheckChar / hasValidCheckChar", () => {
  it.each(VECTORS)("%s → %s (igual que el backend)", (payload, check) => {
    expect(luhnMod32CheckChar(payload)).toBe(check);
    expect(hasValidCheckChar(payload + check)).toBe(true);
    expect(isValidBottleCode(payload + check)).toBe(true);
  });

  it("rechaza caracteres fuera del alfabeto", () => {
    expect(() => luhnMod32CheckChar("K7M2Q9U")).toThrow(/alfabeto/);
    expect(hasValidCheckChar("K7M2Q9UM")).toBe(false);
    expect(hasValidCheckChar("")).toBe(false);
  });

  it("detecta cualquier error de un solo carácter", () => {
    const code = "K7M2Q9XM";
    for (let i = 0; i < code.length; i++) {
      for (const c of CROCKFORD_ALPHABET) {
        if (c === code[i]) continue;
        const wrong = code.slice(0, i) + c + code.slice(i + 1);
        expect(isValidBottleCode(wrong), wrong).toBe(false);
      }
    }
  });

  it("detecta las transposiciones de vecinos de este código", () => {
    const code = "K7M2Q9XM";
    for (let i = 0; i + 1 < code.length; i++) {
      const swapped = code.slice(0, i) + code[i + 1] + code[i] + code.slice(i + 2);
      expect(isValidBottleCode(swapped), swapped).toBe(false);
    }
  });
});

describe("isValidBottleCode", () => {
  it("exige 8 caracteres exactos", () => {
    expect(BOTTLE_CODE_LENGTH).toBe(8);
    expect(isValidBottleCode("K7M2Q9XM")).toBe(true);
    expect(isValidBottleCode("K7M2Q9")).toBe(false);
    expect(isValidBottleCode("K7M2Q9XMM")).toBe(false);
    expect(isValidBottleCode("UUUUUUUU")).toBe(false);
    // El ejemplo del contrato (`K7M2Q9XA`) es ilustrativo: su control real es la M.
    expect(isValidBottleCode("K7M2Q9XA")).toBe(false);
  });
});

describe("normalizeBottleCode (§7.1)", () => {
  it("pasa a mayúsculas y quita espacios y guiones", () => {
    expect(normalizeBottleCode("k7m2-q9xm")).toBe("K7M2Q9XM");
    expect(normalizeBottleCode("  k7m2 q9xm \n")).toBe("K7M2Q9XM");
    expect(normalizeBottleCode("K7-M2-Q9-XM")).toBe("K7M2Q9XM");
    expect(normalizeBottleCode("K7M2–Q9XM")).toBe("K7M2Q9XM");
    expect(normalizeBottleCode("K7M2—Q9XM")).toBe("K7M2Q9XM");
  });

  it("resuelve las confusiones O → 0 e I/L → 1", () => {
    expect(normalizeBottleCode(" OIL 0-1 ")).toBe("01101");
    expect(normalizeBottleCode("oil")).toBe("011");
    expect(normalizeBottleCode("DoQ8B5S1")).toBe("D0Q8B5S1");
    expect(normalizeBottleCode("d0q8b5sl")).toBe("D0Q8B5S1");
    expect(normalizeBottleCode("D0Q8B5SI")).toBe("D0Q8B5S1");
  });

  it("no toca lo demás (la U y los signos se rechazan después)", () => {
    expect(normalizeBottleCode("u7m2.q9xm")).toBe("U7M2.Q9XM");
  });
});

describe("formatBottleCode", () => {
  it("imprime XXXX-XXXX", () => {
    expect(formatBottleCode("K7M2Q9XM")).toBe("K7M2-Q9XM");
  });
});

describe("suggestBottleCode", () => {
  it("corrige un carácter parecido cuando solo hay una opción", () => {
    // 8 ↔ B, 5 ↔ S, 2 ↔ Z, 0 ↔ Q/D
    expect(suggestBottleCode("DOQBB5S1".replace("O", "0"))).toBe("D0Q8B5S1");
    expect(suggestBottleCode("D0Q8BSS1")).toBe("D0Q8B5S1");
    expect(suggestBottleCode("K7MZQ9XM")).toBe("K7M2Q9XM");
    expect(suggestBottleCode("K7M209XM")).toBe("K7M2Q9XM");
  });

  it("corrige dos vecinos intercambiados", () => {
    expect(suggestBottleCode("K7M29QXM")).toBe("K7M2Q9XM");
  });

  it("cambia la U (que no existe) por la V y descarta signos sueltos", () => {
    const withV = "K7M2Q9V" + luhnMod32CheckChar("K7M2Q9V");
    expect(suggestBottleCode(withV.replace("V", "U"))).toBe(withV);
    expect(suggestBottleCode("K7M2.Q9XM")).toBe("K7M2Q9XM");
  });

  it("no adivina si no hay corrección, si hay varias o si la longitud no es 8", () => {
    expect(suggestBottleCode("K7M2Q9XB")).toBeNull();
    expect(suggestBottleCode("K7M2Q9X")).toBeNull();
    expect(suggestBottleCode("K7M2Q9XMM")).toBeNull();
    expect(suggestBottleCode("")).toBeNull();
    // Ya es válido: no hay nada que sugerir.
    expect(suggestBottleCode("K7M2Q9XM")).toBeNull();
  });

  it("toda sugerencia es un código válido", () => {
    for (const input of ["D0Q8BSS1", "K7MZQ9XM", "K7M29QXM", "A1B2C3DV", "4F8K2N0E", "SGR26CM7"]) {
      const suggestion = suggestBottleCode(input);
      if (suggestion !== null) expect(isValidBottleCode(suggestion), `${input} → ${suggestion}`).toBe(true);
    }
  });
});
