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

/** Crea una cuenta nueva desde `/crear-cuenta` y espera al perfil. */
export async function signup(page: Page, email: string, fullName = "Lucía Vargas") {
  await page.goto("/crear-cuenta");
  await page.getByRole("textbox", { name: /Nombre completo/ }).fill(fullName);
  await page.getByRole("textbox", { name: /Correo electrónico/ }).fill(email);
  await page.getByLabel(/^Contraseña/).fill("una-clave-larga-2026");
  await page.getByRole("checkbox", { name: /Acepto el aviso legal/ }).check();
  await page.getByRole("checkbox", { name: /mayor de 18 años/ }).check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
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
