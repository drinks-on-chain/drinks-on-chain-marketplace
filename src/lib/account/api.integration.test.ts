// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { demoUsers } from "@drinks-on-chain/mocks/fixtures";
import { mockMailbox, resetErpDb, resetSessions, setupMockServer } from "@drinks-on-chain/mocks/node";
import { isValidStrKey } from "@drinks-on-chain/mocks";
import { HttpResponse, http } from "msw";
import { getSessionStatus, resetSessionForTests } from "@/lib/api/session";
import {
  NotConsumerError,
  fetchConsumerProfile,
  login,
  logout,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  signup,
  verifyEmail,
  type SignupInput,
} from "./api";

// La cuenta por correo (2B) contra los handlers reales de `@drinks-on-chain/mocks`: alta, entrada,
// perfil del borrador §13.1, recuperación de contraseña y verificación del correo.

const ORIGIN = "http://localhost:3005";
const server = setupMockServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  const intercepted = globalThis.fetch;
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
    intercepted(typeof input === "string" && input.startsWith("/") ? `${ORIGIN}${input}` : input, init),
  );
});
afterEach(() => {
  server.resetHandlers();
  resetErpDb();
  resetSessions();
  resetSessionForTests();
});
afterAll(() => {
  vi.unstubAllGlobals();
  server.close();
});

const consumer = demoUsers.find((u) => u.audience === "CONSUMER")!;
const staff = demoUsers.find((u) => u.audience !== "CONSUMER" && !u.platformRole)!;
const CAPTCHA = "XXXX.DUMMY.TOKEN.XXXX";

const newcomer = (patch: Partial<SignupInput> = {}): SignupInput => ({
  fullName: "Lucía Vargas",
  email: "lucia.vargas@ejemplo.test",
  password: "una-clave-larga-2026",
  acceptTerms: true,
  ageDeclaration: true,
  captchaToken: CAPTCHA,
  website: "",
  ...patch,
});

describe("entrar", () => {
  it("un consumidor entra y puede leer su perfil, con su dirección custodial de solo lectura", async () => {
    await login({ email: consumer.email, password: consumer.password });
    expect(getSessionStatus()).toBe("authenticated");
    const profile = await fetchConsumerProfile();
    expect(profile).toMatchObject({ email: consumer.email, fullName: consumer.fullName });
    expect(profile.address).toMatchObject({ custodial: true, network: "TESTNET" });
    expect(isValidStrKey(profile.address!.address)).toBe(true);
    expect(profile.address!.explorerUrl).toMatch(/^https:\/\//);
  });

  it("contraseña equivocada: 401 con su código, sin sesión", async () => {
    await expect(login({ email: consumer.email, password: "no-es-esta" })).rejects.toMatchObject({
      status: 401,
      code: "AUTH_INVALID_CREDENTIALS",
    });
    expect(getSessionStatus()).not.toBe("authenticated");
  });

  it("el personal de una bodega no entra aquí: se cierra la sesión que abrió el backend", async () => {
    await expect(login({ email: staff.email, password: staff.password })).rejects.toBeInstanceOf(NotConsumerError);
    expect(getSessionStatus()).toBe("anonymous");
  });

  it("salir cierra la sesión y el perfil deja de responder", async () => {
    await login({ email: consumer.email, password: consumer.password });
    await logout();
    expect(getSessionStatus()).toBe("anonymous");
  });
});

describe("crear cuenta", () => {
  it("con el OpenAPI vigente el alta responde con la sesión abierta", async () => {
    await expect(signup(newcomer())).resolves.toEqual({ kind: "signed-in" });
    expect(getSessionStatus()).toBe("authenticated");
    await expect(fetchConsumerProfile()).resolves.toMatchObject({ email: "lucia.vargas@ejemplo.test" });
  });

  it("[BORRADOR §13.1] con el 202 `VERIFICATION_SENT` no hay sesión hasta confirmar el correo", async () => {
    server.use(
      http.post(`${ORIGIN}/api/v1/auth/signup`, () =>
        HttpResponse.json({ success: true, statusCode: 202, data: { status: "VERIFICATION_SENT" } }, { status: 202 }),
      ),
    );
    await expect(signup(newcomer())).resolves.toEqual({ kind: "verification-sent" });
    expect(getSessionStatus()).not.toBe("authenticated");
  });

  it("un correo que ya tiene cuenta es un 409", async () => {
    await expect(signup(newcomer({ email: consumer.email }))).rejects.toMatchObject({ status: 409 });
  });
});

describe("recuperar contraseña y verificar el correo", () => {
  it("pide el enlace (202 siempre), elige una contraseña nueva y entra con ella", async () => {
    await requestPasswordReset({ email: consumer.email, captchaToken: CAPTCHA, website: "" });
    const mail = mockMailbox.latest({ to: consumer.email, template: "PASSWORD_RESET" });
    // El enlace del correo apunta a la ruta de esta app.
    expect(mail?.link).toContain("/restablecer-contrasena?token=");
    await expect(resetPassword({ token: mail!.token!, password: "corta" })).rejects.toMatchObject({
      status: 422,
      code: "AUTH_WEAK_PASSWORD",
    });
    await resetPassword({ token: mail!.token!, password: "otra-clave-larga-2026" });
    await login({ email: consumer.email, password: "otra-clave-larga-2026" });
    expect(getSessionStatus()).toBe("authenticated");
    // El enlace es de un solo uso.
    await expect(resetPassword({ token: mail!.token!, password: "tercera-clave-larga" })).rejects.toMatchObject({
      code: "AUTH_RESET_TOKEN_INVALID",
    });
  });

  it("un correo sin cuenta también responde «aceptado», sin enviar nada", async () => {
    await expect(
      requestPasswordReset({ email: "nadie@ejemplo.test", captchaToken: CAPTCHA, website: "" }),
    ).resolves.toBeUndefined();
    expect(mockMailbox.latest({ to: "nadie@ejemplo.test" })).toBeNull();
  });

  it("el campo trampa relleno se acepta y no hace nada; un captcha rechazado es un 422", async () => {
    await requestPasswordReset({ email: consumer.email, captchaToken: CAPTCHA, website: "http://spam.test" });
    expect(mockMailbox.latest({ to: consumer.email, template: "PASSWORD_RESET" })).toBeNull();
    await expect(
      requestPasswordReset({ email: consumer.email, captchaToken: "fail", website: "" }),
    ).rejects.toMatchObject({ status: 422, code: "CAPTCHA_INVALID" });
  });

  it("reenvía el enlace de verificación y lo confirma una sola vez", async () => {
    await resendVerification({ email: consumer.email, captchaToken: CAPTCHA, website: "" });
    const mail = mockMailbox.latest({ to: consumer.email, template: "EMAIL_VERIFY" });
    expect(mail?.link).toContain("/verificar-correo?token=");
    await expect(verifyEmail(mail!.token!)).resolves.toEqual({ signedIn: false });
    await expect(verifyEmail(mail!.token!)).rejects.toMatchObject({ code: "AUTH_EMAIL_TOKEN_INVALID" });
  });
});
