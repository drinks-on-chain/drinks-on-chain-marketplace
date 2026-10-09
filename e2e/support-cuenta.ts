import { expect, type Page } from "@playwright/test";
import { demoUsers } from "@drinks-on-chain/mocks/fixtures";

// Utilidades de las e2e de la cuenta (2B) y la compra (2C) contra los mocks.

/** Consumidora de demostración de los fixtures. */
export const CONSUMER = (() => {
  const user = demoUsers.find((u) => u.audience === "CONSUMER")!;
  return { email: user.email, password: user.password, fullName: user.fullName };
})();

/** Persona del equipo de una bodega (no puede entrar en el Marketplace). */
export const STAFF = (() => {
  const user = demoUsers.find((u) => u.audience !== "CONSUMER" && !u.platformRole)!;
  return { email: user.email, password: user.password };
})();

/** Rellena y envía el formulario de entrada que haya en pantalla (página, `/cuenta` o la hoja de compra). */
export async function login(page: Page, credentials: { email: string; password: string } = CONSUMER) {
  await page.getByRole("textbox", { name: /Correo electrónico/ }).fill(credentials.email);
  await page.getByLabel(/^Contraseña/).fill(credentials.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

/** Contraseña de las cuentas que crean las pruebas. */
export const NEW_PASSWORD = "una-clave-larga-2026";

/** Rellena y envía el alta que haya en pantalla (página o hoja de compra) y espera el «Revisa tu correo». */
export async function fillSignup(page: Page, email: string, fullName = "Lucía Vargas") {
  await page.getByRole("textbox", { name: /Nombre completo/ }).fill(fullName);
  await page.getByRole("textbox", { name: /Correo electrónico/ }).fill(email);
  await page.getByLabel(/^Contraseña/).fill(NEW_PASSWORD);
  await page.getByRole("checkbox", { name: /Acepto el aviso legal/ }).check();
  await page.getByRole("checkbox", { name: /mayor de 18 años/ }).check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  // [BORRADOR §13.1] 202 sin sesión: hay que confirmar el correo.
  await expect(page.getByText("Revisa tu correo")).toBeVisible();
}

/**
 * Cuenta nueva de principio a fin: alta en `/crear-cuenta`, enlace de verificación del buzón
 * simulado, entrada y perfil.
 */
export async function signup(page: Page, email: string, fullName = "Lucía Vargas") {
  await page.goto("/crear-cuenta");
  await fillSignup(page, email, fullName);
  const mail = await latestMail(page, email, "EMAIL_VERIFY");
  await page.goto(`/verificar-correo?token=${encodeURIComponent(mail.token)}`);
  await expect(page.getByText("Correo confirmado")).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Entrar", exact: true }).click();
  await login(page, { email, password: NEW_PASSWORD });
  await expect(page.getByRole("heading", { level: 1, name: "Mi cuenta" })).toBeVisible();
}

type Mail = { link: string; token: string };

/** Último correo del buzón simulado de los mocks para ese destinatario y plantilla. */
export async function latestMail(page: Page, to: string, template: string): Promise<Mail> {
  const mail = await page.evaluate(
    ([address, kind]) => {
      const mocks = (
        window as unknown as {
          __docMocks: {
            mailbox: {
              latest(filter: { to: string; template: string }): { link: string | null; token: string | null } | null;
            };
          };
        }
      ).__docMocks;
      return mocks.mailbox.latest({ to: address!, template: kind! });
    },
    [to, template],
  );
  expect(mail, `correo ${template} para ${to}`).not.toBeNull();
  return { link: mail!.link ?? "", token: mail!.token ?? "" };
}
