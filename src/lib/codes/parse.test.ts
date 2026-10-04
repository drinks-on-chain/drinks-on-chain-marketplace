import { describe, expect, it } from "vitest";
import { parseCode } from "./parse";

describe("parseCode · código de botella", () => {
  it("acepta el código tal como se imprime, en minúsculas, con espacios y con guiones", () => {
    const expected = { kind: "bottle", code: "K7M2Q9XM", formatted: "K7M2-Q9XM" };
    for (const input of ["K7M2Q9XM", "K7M2-Q9XM", "k7m2-q9xm", " k7m2 q9xm ", "K7M2–Q9XM", "k7-m2-q9-xm"]) {
      expect(parseCode(input), input).toEqual(expected);
    }
  });

  it("resuelve O/0 e I/L/1 antes de validar", () => {
    expect(parseCode("DOQ8B5SL")).toEqual({ kind: "bottle", code: "D0Q8B5S1", formatted: "D0Q8-B5S1" });
    expect(parseCode("d0q8-b5si")).toMatchObject({ kind: "bottle", code: "D0Q8B5S1" });
    expect(parseCode("oooooooo")).toMatchObject({ kind: "bottle", code: "00000000" });
  });

  it("saca el código de la URL del QR si se pega entera", () => {
    expect(parseCode("https://app.ejemplo.bo/b/K7M2Q9XM")).toMatchObject({ kind: "bottle", code: "K7M2Q9XM" });
    expect(parseCode("app.ejemplo.bo/b/k7m2-q9xm?utm=qr")).toMatchObject({ kind: "bottle", code: "K7M2Q9XM" });
    expect(parseCode("https://viejo.ejemplo.bo/trace/batch/CVJ-2026-SINGANI-004")).toMatchObject({
      kind: "lot",
      code: "CVJ-2026-SINGANI-004",
    });
  });
});

describe("parseCode · código de lote", () => {
  it("reconoce la forma {prefijo}-{año}-{WINE|SINGANI}-{NNN}", () => {
    expect(parseCode("CVJ-2026-SINGANI-004")).toEqual({
      kind: "lot",
      code: "CVJ-2026-SINGANI-004",
      formatted: "CVJ-2026-SINGANI-004",
    });
    expect(parseCode(" cvj-2026-wine-012 ")).toMatchObject({ kind: "lot", code: "CVJ-2026-WINE-012" });
    expect(parseCode("ADC – 2025 – WINE – 001")).toMatchObject({ kind: "lot", code: "ADC-2025-WINE-001" });
  });

  it("no cambia las letras del lote (la I y la O de SINGANI son suyas)", () => {
    expect(parseCode("oli-2026-singani-010")).toMatchObject({ kind: "lot", code: "OLI-2026-SINGANI-010" });
  });

  it("sin la forma completa no es un lote", () => {
    for (const input of ["CVJ-2026-SINGANI", "CVJ-26-SINGANI-004", "CVJ2026SINGANI004", "CVJ-2026-RON-004"]) {
      expect(parseCode(input), input).toMatchObject({ kind: "malformed" });
    }
    expect(parseCode("CVJ-2026-SINGANI")).toMatchObject({ kind: "malformed", reason: "too-long" });
  });
});

describe("parseCode · mal escrito", () => {
  it("vacío", () => {
    expect(parseCode("   ")).toEqual({ kind: "malformed", input: "", reason: "empty", length: 0, suggestion: null });
  });

  it("corto y largo, con los caracteres contados", () => {
    expect(parseCode("K7M2-Q9X")).toMatchObject({ kind: "malformed", reason: "too-short", length: 7 });
    expect(parseCode("K7M2-Q9XM-M")).toMatchObject({ kind: "malformed", reason: "too-long", length: 9 });
  });

  it("caracteres que el código no usa", () => {
    expect(parseCode("K7M2Q9UM")).toMatchObject({ kind: "malformed", reason: "characters", length: 8 });
    expect(parseCode("K7M2_Q9XM")).toMatchObject({ kind: "malformed", reason: "characters", suggestion: "K7M2Q9XM" });
    expect(parseCode("¿K7M2?")).toMatchObject({ kind: "malformed", reason: "characters" });
  });

  it("control que no cuadra, con sugerencia cuando hay una sola corrección", () => {
    expect(parseCode("K7MZ-Q9XM")).toEqual({
      kind: "malformed",
      input: "K7MZ-Q9XM",
      reason: "check",
      length: 8,
      suggestion: "K7M2Q9XM",
    });
    expect(parseCode("K7M2-Q9XB")).toMatchObject({ kind: "malformed", reason: "check", suggestion: null });
  });

  it("conserva lo que se escribió para volver a mostrarlo", () => {
    expect(parseCode("  k7m2 q9xa ")).toMatchObject({ kind: "malformed", input: "k7m2 q9xa" });
  });
});
