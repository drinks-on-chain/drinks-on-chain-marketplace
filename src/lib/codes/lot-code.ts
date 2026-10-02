// Códigos de lote de la etiqueta (contrato de la Ola 2 §6.3):
// `{lotPrefix}-{año del embotellado}-{WINE|SINGANI}-{NNN}`, p. ej. `CVJ-2026-SINGANI-004`.
//
// Aquí solo se reconoce la **forma**: la misma, laxa, con la que el backend lee sus secuencias
// (`^[A-Z]+-[0-9]{4}-[A-Z]+-[0-9]+$`), para no rechazar en el cliente un código que el servidor
// sí conoce (lotes migrados). Que exista o no lo dice el pasaporte.

const LOT_CODE_SHAPE = /^[A-Z]{2,10}-\d{4}-[A-Z]{2,12}-\d{1,6}$/;

/** Mayúsculas, sin espacios y con los guiones tipográficos (–, —) convertidos en guion normal. */
export function normalizeLotCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+/g, "");
}

/** ¿Tiene forma de código de lote (ya normalizado)? */
export function isLotCodeShape(normalized: string): boolean {
  return LOT_CODE_SHAPE.test(normalized);
}
