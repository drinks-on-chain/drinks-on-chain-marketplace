import { describe, expect, it } from "vitest";
import { ApiError, NetworkError } from "@/lib/api/errors";
import { NotConsumerError } from "./api";
import { emailError, failureFrom, newPasswordError, validateLogin, validateSignup } from "./validation";

const signup = {
  fullName: "María Fernández",
  email: "maria@ejemplo.bo",
  password: "una-clave-larga",
  acceptTerms: true,
  ageDeclaration: true,
};

describe("validación de los formularios de la cuenta", () => {
  it("correo: obligatorio y con forma de correo", () => {
    expect(emailError("")).toBe("Escribe tu correo.");
    expect(emailError("maria@")).toBe("Ese correo no parece válido. Revísalo.");
    expect(emailError("  maria@ejemplo.bo ")).toBeUndefined();
  });

  it("contraseña nueva: al menos 10 caracteres", () => {
    expect(newPasswordError("")).toBe("Escribe tu contraseña.");
    expect(newPasswordError("123456789")).toBe("La contraseña debe tener al menos 10 caracteres.");
    expect(newPasswordError("1234567890")).toBeUndefined();
  });

  it("entrar: solo pide que haya correo y contraseña (la política es del alta)", () => {
    expect(validateLogin({ email: "maria@ejemplo.bo", password: "corta" })).toEqual({});
    expect(validateLogin({ email: "", password: "" })).toEqual({
      email: "Escribe tu correo.",
      password: "Escribe tu contraseña.",
    });
  });

  it("alta: sin los términos o sin la declaración de mayoría de edad no se envía", () => {
    expect(validateSignup(signup)).toEqual({});
    expect(validateSignup({ ...signup, acceptTerms: false, ageDeclaration: false })).toEqual({
      acceptTerms: "Para crear la cuenta tienes que aceptar el aviso legal y la política de privacidad.",
      ageDeclaration: "Para crear la cuenta tienes que declarar que eres mayor de 18 años.",
    });
    expect(Object.keys(validateSignup({ ...signup, fullName: " ", email: "x", password: "corta" }))).toEqual([
      "fullName",
      "email",
      "password",
    ]);
  });
});

describe("errores del backend en los formularios", () => {
  const apiError = (status: number, code: string, details?: unknown) =>
    new ApiError({ status, code, message: "mensaje del backend", details });

  it("credenciales: un solo mensaje, sin decir cuál de los dos falló", () => {
    expect(failureFrom(apiError(401, "AUTH_INVALID_CREDENTIALS"), ["email", "password"])).toEqual({
      fields: {},
      form: "El correo o la contraseña no son correctos.",
    });
  });

  it("una cuenta que no es de consumidor se explica", () => {
    expect(failureFrom(new NotConsumerError(), ["email"]).form).toMatch(/cuenta de cliente/);
  });

  it("correo repetido en el alta: en su campo", () => {
    expect(failureFrom(apiError(409, "CONFLICT"), ["fullName", "email", "password"])).toEqual({
      fields: { email: "Ya hay una cuenta con ese correo. Entra con ella o recupera tu contraseña." },
      form: null,
    });
  });

  it("contraseña débil: el mensaje del backend, junto al campo (`details[].field`)", () => {
    const error = apiError(422, "AUTH_WEAK_PASSWORD", [
      { field: "password", message: "Es una contraseña demasiado común" },
    ]);
    expect(failureFrom(error, ["fullName", "email", "password"])).toEqual({
      fields: { password: "Es una contraseña demasiado común" },
      form: null,
    });
  });

  it("captcha rechazado, límite de intentos y sin conexión: mensaje general", () => {
    expect(failureFrom(apiError(422, "CAPTCHA_INVALID"), ["email"]).form).toMatch(/comprobación de seguridad/);
    const limited = new ApiError({ status: 429, code: "AUTH_TOO_MANY_ATTEMPTS", message: "", retryAfter: 60 });
    expect(failureFrom(limited, ["email"]).form).toBe("Demasiados intentos. Vuelve a intentarlo en 1 minuto.");
    expect(failureFrom(new NetworkError(null), ["email"]).form).toBe("No se pudo conectar con el servidor.");
  });
});
