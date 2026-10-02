import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { luhnMod32CheckChar } from "@drinks-on-chain/mocks";
import { SINGANI_CASE, publicFixtures } from "@drinks-on-chain/mocks/fixtures";

// Utilidades de las e2e del Marketplace contra los mocks: códigos de muestra, errores de consola,
// auditoría axe (WCAG 2.1 A y AA), foco visible y desbordamiento horizontal.

/** Código de botella con el control correcto que **no existe** en los datos: "no encontrado". */
export const BOTTLE = { code: "K7M2Q9XM", formatted: "K7M2-Q9XM" } as const;
/** El mismo con un carácter parecido cambiado (2 → Z): el control no cuadra y hay una sola corrección. */
export const BOTTLE_TYPO = "K7MZ-Q9XM";

/** Caso del contrato §18: «Singani Gran Reserva 2026», certificado, con el expediente cerrado. */
export const CASE = (() => {
  const lotCode = "CVJ-2026-SINGANI-004";
  const sample = publicFixtures.bottleCodes.find((s) => s.lotCode === lotCode)!;
  const format = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;
  const first = sample.codes.find((c) => c.serial === 1)!.code;
  const voided = sample.codes.find((c) => c.status === "VOIDED")!.code;
  return {
    lotCode,
    name: SINGANI_CASE.name,
    total: "2.950",
    winery: "Destilería Cinti Viejo",
    winerySlug: "destileria-cinti-viejo",
    collectionSlug: "singani-gran-reserva-2026",
    /** Botella n.º 1, activa. */
    bottle: { code: first, formatted: format(first) },
    /** Código anulado de la serie 17 (etiqueta dañada). */
    voided: { code: voided, formatted: format(voided), serial: SINGANI_CASE.replacedSerial },
  } as const;
})();

/** Vino migrado con el expediente abierto y sin análisis de laboratorio. */
export const WINE_LOT = "CVJ-2026-WINE-003";
/** Colección en preventa sin precio ni lote embotellado. */
export const NO_PRICE_COLLECTION = {
  slug: "singani-edicion-aniversario-2026",
  name: "Singani Edición Aniversario 2026",
};

/** `count` códigos de botella bien formados que no existen (para el freno a la enumeración). */
export function missingCodes(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const payload = `ZZZZ${i.toString(32).toUpperCase().padStart(3, "0")}`.replace(/[ILOU]/g, "X");
    return payload + luhnMod32CheckChar(payload);
  });
}

/** Errores de página y de consola. Un 404 o un 429 esperado sale como "Failed to load resource": no cuenta. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) errors.push(m.text());
  });
  return errors;
}

/** Violaciones serias o críticas de axe (las menores se revisan a mano). */
export async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.map((n) => `${n.target.join(" ")} :: ${n.failureSummary?.split("\n").slice(1).join(" ")}`),
    }));
}

/** El elemento con foco tiene un anillo visible (outline de 2 px). */
export function hasVisibleFocus(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return false;
    const s = getComputedStyle(el);
    return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2;
  });
}

/** La página no se desplaza en horizontal (móvil primero). */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "desbordamiento horizontal en px").toBeLessThanOrEqual(0);
}

/** ¿El proyecto en curso es el de 390 px? */
export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

/** Navegación del shell visible en este tamaño: pestañas en móvil, cabecera en escritorio. */
export const shellNav = (page: Page) =>
  page.getByRole("navigation", { name: isMobile(page) ? "Secciones" : "Principal" });

/** Error del campo del código (el `role="alert"` del formulario, no el anunciador de rutas de Next). */
export const fieldError = (page: Page) => page.locator('form [role="alert"]');
export const codeField = (page: Page) => page.getByRole("textbox", { name: "Código de la botella" });
export const verifyButton = (page: Page) => page.getByRole("button", { name: "Verificar", exact: true });
