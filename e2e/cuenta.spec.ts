import { expect, test, type Page } from "@playwright/test";
import { axe, expectNoHorizontalScroll, hasVisibleFocus, isMobile, shellNav, trackErrors } from "./support";
import { CONSUMER, STAFF, latestMail, login, signup } from "./support-cuenta";

// 2B · Cuenta por correo contra los mocks (bandera `NEXT_PUBLIC_MK_ACCOUNT=1`): alta con términos,
// mayoría de edad, captcha de prueba y campo trampa; entrada; perfil con la dirección informativa
// de solo lectura; recuperación de contraseña y verificación del correo con el buzón simulado.

const emailField = (page: Page) => page.getByRole("textbox", { name: /Correo electrónico/ });
const passwordField = (page: Page) => page.getByLabel(/^Contraseña/);
const formAlert = (page: Page) => page.getByRole("main").getByRole("alert");

test("crear cuenta: declaraciones obligatorias, perfil y dirección informativa de solo lectura", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/crear-cuenta");
  await expect(page.getByRole("heading", { level: 1, name: "Crear cuenta" })).toBeVisible();
  // Solo correo y contraseña: sin passkeys, SMS ni proveedores sociales.
  await expect(page.getByRole("main")).not.toContainText(/passkey|Google|Apple|Facebook|SMS|teléfono/i);

  // Sin las dos declaraciones no se envía, y cada casilla dice por qué.
  await page.getByRole("textbox", { name: /Nombre completo/ }).fill("Lucía Vargas");
  await emailField(page).fill(`lucia.${test.info().project.name}@ejemplo.test`);
  await passwordField(page).fill("una-clave-larga-2026");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByText("Para crear la cuenta tienes que aceptar el aviso legal")).toBeVisible();
  await expect(page.getByText("Para crear la cuenta tienes que declarar que eres mayor de 18 años.")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Acepto el aviso legal/ })).toBeFocused();
  expect(await axe(page)).toEqual([]);
  await expectNoHorizontalScroll(page);

  await page.getByRole("checkbox", { name: /Acepto el aviso legal/ }).check();
  await page.getByRole("checkbox", { name: /mayor de 18 años/ }).check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  // Con el OpenAPI vigente el alta abre la sesión: se llega al perfil.
  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(page.getByRole("heading", { level: 1, name: "Mi cuenta" })).toBeVisible();
  await expect(page.getByText("Lucía Vargas")).toBeVisible();

  const address = page.getByRole("region", { name: "Tu dirección en la red" });
  await expect(address).toContainText("La gestiona Drinks on Chain; no necesitas hacer nada.");
  await expect(address.getByRole("button", { name: /Copiar dirección/ })).toBeVisible();
  await expect(address.getByRole("link", { name: /Ver la dirección en el explorador/ })).toHaveAttribute(
    "href",
    /^https:\/\/.+\/account\/G[A-Z2-7]{55}$/,
  );
  // Solo lectura: nada que escribir, firmar ni exportar.
  await expect(address.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("main")).not.toContainText(/wallet|billetera|frase|clave privada/i);

  // La navegación ya conoce la sesión.
  if (isMobile(page)) await expect(shellNav(page).getByRole("link", { name: "Cuenta" })).toBeVisible();
  else await expect(page.getByRole("banner").getByRole("link", { name: "Mi cuenta" })).toBeVisible();

  expect(await axe(page)).toEqual([]);
  await expectNoHorizontalScroll(page);

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/$/);
  if (!isMobile(page)) await expect(page.getByRole("banner").getByRole("link", { name: "Entrar" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("entrar con el teclado, y la sesión sobrevive a una recarga", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/entrar");
  await emailField(page).focus();
  expect(await hasVisibleFocus(page)).toBe(true);
  await page.keyboard.type(CONSUMER.email);
  await page.keyboard.press("Tab");
  await expect(passwordField(page)).toBeFocused();
  await page.keyboard.type(CONSUMER.password);
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(page.getByText(CONSUMER.fullName)).toBeVisible();
  await expect(page.getByText("Correo confirmado")).toBeVisible();

  // El acceso vive en memoria; la recarga lo recupera con la cookie de renovación.
  await page.reload();
  await expect(page.getByText(CONSUMER.fullName)).toBeVisible();
  await expect(page.getByRole("region", { name: "Tu dirección en la red" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("entrar: credenciales incorrectas y cuenta que no es de cliente", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("Escribe tu correo.")).toBeVisible();
  await expect(emailField(page)).toBeFocused();
  expect(await axe(page)).toEqual([]);

  await emailField(page).fill(CONSUMER.email);
  await passwordField(page).fill("no-es-esta-clave");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(formAlert(page)).toContainText("El correo o la contraseña no son correctos.");
  await expect(page).toHaveURL(/\/entrar$/);

  // El personal de una bodega entra en el ERP, no aquí.
  await emailField(page).fill(STAFF.email);
  await passwordField(page).fill(STAFF.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(formAlert(page)).toContainText("Aquí se entra con una cuenta de cliente.");
  await expect(page).toHaveURL(/\/entrar$/);
});

test("después de entrar se vuelve a donde se iba (solo rutas internas)", async ({ page }) => {
  await page.goto("/entrar?volver=%2Fbodegas");
  await login(page);
  await expect(page).toHaveURL(/\/bodegas$/);
});

test("un destino externo en ?volver= se ignora", async ({ page }) => {
  await page.goto("/entrar?volver=%2F%2Fotro.ejemplo.test%2Frobo");
  await login(page);
  await expect(page).toHaveURL(/\/cuenta$/);
});

test("/cuenta sin sesión: ofrece entrar ahí mismo y luego muestra el perfil", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/cuenta");
  await expect(page.getByRole("heading", { level: 1, name: "Entra para continuar" })).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await login(page);
  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(page.getByRole("heading", { level: 1, name: "Mi cuenta" })).toBeVisible();
  await expect(page.getByText(CONSUMER.fullName)).toBeVisible();
  expect(errors).toEqual([]);
});

test("recuperar contraseña: enlace del correo, contraseña nueva y entrada con ella", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/entrar");
  await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
  await expect(page).toHaveURL(/\/recuperar-contrasena$/);
  await expect(page.getByRole("heading", { level: 1, name: "Recuperar contraseña" })).toBeVisible();
  expect(await axe(page)).toEqual([]);

  await emailField(page).fill(CONSUMER.email);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  // No se revela si el correo tiene cuenta.
  await expect(page.getByText(/Si ese correo tiene una cuenta, te enviamos un enlace/)).toBeVisible();

  const mail = await latestMail(page, CONSUMER.email, "PASSWORD_RESET");
  expect(mail.link).toContain("/restablecer-contrasena?token=");
  await page.goto(`/restablecer-contrasena?token=${encodeURIComponent(mail.token)}`);
  await expect(page.getByRole("heading", { level: 1, name: "Elige una contraseña nueva" })).toBeVisible();

  // La política de contraseñas se ve en el campo.
  await page.getByLabel(/Contraseña nueva/).fill("corta");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.getByText("La contraseña debe tener al menos 10 caracteres.")).toBeVisible();
  expect(await axe(page)).toEqual([]);

  await page.getByLabel(/Contraseña nueva/).fill("otra-clave-larga-2026");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.getByText("Contraseña cambiada")).toBeVisible();

  await page.getByRole("link", { name: "Entrar", exact: true }).last().click();
  await login(page, { email: CONSUMER.email, password: "otra-clave-larga-2026" });
  await expect(page).toHaveURL(/\/cuenta$/);
  expect(errors).toEqual([]);
});

test("un enlace de recuperación sin código, o que ya no vale, lo dice y deja pedir otro", async ({ page }) => {
  await page.goto("/restablecer-contrasena");
  await expect(page.getByText("Este enlace no es válido")).toBeVisible();
  await expect(page.getByRole("link", { name: "Pedir un enlace nuevo" })).toHaveAttribute(
    "href",
    "/recuperar-contrasena",
  );

  await page.goto("/restablecer-contrasena?token=inventado");
  await page.getByLabel(/Contraseña nueva/).fill("otra-clave-larga-2026");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.getByText("El enlace no es válido o caducó. Pide uno nuevo.")).toBeVisible();
});

test("verificar el correo: pedir el enlace, confirmarlo y que no valga dos veces", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/verificar-correo");
  await expect(page.getByRole("heading", { level: 1, name: "Confirmar correo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "¿No te llegó el correo?" })).toBeVisible();
  expect(await axe(page)).toEqual([]);

  await emailField(page).fill(CONSUMER.email);
  await page.getByRole("button", { name: "Enviar otro enlace" }).click();
  await expect(page.getByText(/te enviamos otro enlace/)).toBeVisible();

  const mail = await latestMail(page, CONSUMER.email, "EMAIL_VERIFY");
  expect(mail.link).toContain("/verificar-correo?token=");
  const link = `/verificar-correo?token=${encodeURIComponent(mail.token)}`;
  await page.goto(link);
  await expect(page.getByText("Correo confirmado")).toBeVisible();
  expect(await axe(page)).toEqual([]);

  // El enlace es de un solo uso.
  await page.goto(link);
  await expect(page.getByText("No pudimos confirmar tu correo")).toBeVisible();
  await expect(page.getByRole("heading", { name: "¿No te llegó el correo?" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("crear cuenta y entrar se alternan sin salir de la página", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByRole("button", { name: "Crear una cuenta" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Crear cuenta" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /mayor de 18 años/ })).toBeVisible();
  await page.getByRole("button", { name: "Entrar con mi cuenta" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Entrar" })).toBeVisible();
});

test("quien ya tiene sesión no ve el formulario de entrada", async ({ page }) => {
  await signup(page, `ya.dentro.${test.info().project.name}@ejemplo.test`);
  await expect(page).toHaveURL(/\/cuenta$/);
  // Navegación interna: la sesión sigue en memoria.
  await (isMobile(page) ? shellNav(page) : page.getByRole("banner")).getByRole("link", { name: "Catálogo" }).click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await page.goto("/entrar");
  await expect(page).toHaveURL(/\/cuenta$/);
});
