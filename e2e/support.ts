import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// Utilidades de las e2e del Marketplace contra los mocks: errores de consola, auditoría axe
// (WCAG 2.1 A y AA), foco visible y desbordamiento horizontal.

/** Código de botella con el control correcto (no existe en los datos: el visor dirá "no encontrado"). */
export const BOTTLE = { code: "K7M2Q9XM", formatted: "K7M2-Q9XM" } as const;
/** El mismo con un carácter parecido cambiado (2 → Z): el control no cuadra y hay una sola corrección. */
export const BOTTLE_TYPO = "K7MZ-Q9XM";
export const LOT = "CVJ-2026-SINGANI-004";

/** Errores de página y de consola. Un 404 esperado sale como "Failed to load resource": no cuenta. */
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

/** Error del campo del código (el `role="alert"` del formulario, no el anunciador de rutas de Next). */
export const fieldError = (page: Page) => page.locator('form [role="alert"]');
export const codeField = (page: Page) => page.getByRole("textbox", { name: "Código de la botella" });
export const verifyButton = (page: Page) => page.getByRole("button", { name: "Verificar", exact: true });
