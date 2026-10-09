import { ApiError } from "@/lib/api/errors";
import { errorMessage } from "@/lib/api/errors";
import { fieldErrorsFrom } from "@/lib/api/field-errors";
import { es } from "@/lib/i18n/es";
import { AUTH_ERROR_CODES, NotConsumerError, PASSWORD_MIN_LENGTH } from "./api";

// Validación de los formularios de la cuenta, pura y con pruebas. El servidor valida siempre; esto
// solo evita un viaje para lo evidente y pone cada error del backend junto a su campo.

const t = es.account.errors;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type Errors<F extends string> = Partial<Record<F, string>>;

export const emailError = (email: string): string | undefined =>
  !email.trim() ? t.emailRequired : EMAIL.test(email.trim()) ? undefined : t.emailInvalid;

export const newPasswordError = (password: string): string | undefined =>
  !password ? t.passwordRequired : password.length < PASSWORD_MIN_LENGTH ? t.passwordShort : undefined;

export type LoginFields = "email" | "password";
export function validateLogin(values: { email: string; password: string }): Errors<LoginFields> {
  return clean({ email: emailError(values.email), password: values.password ? undefined : t.passwordRequired });
}

export type SignupFields = "fullName" | "email" | "password" | "acceptTerms" | "ageDeclaration";
export function validateSignup(values: {
  fullName: string;
  email: string;
  password: string;
  acceptTerms: boolean;
  ageDeclaration: boolean;
}): Errors<SignupFields> {
  return clean({
    fullName: values.fullName.trim() ? undefined : t.nameRequired,
    email: emailError(values.email),
    password: newPasswordError(values.password),
    acceptTerms: values.acceptTerms ? undefined : t.termsRequired,
    ageDeclaration: values.ageDeclaration ? undefined : t.ageRequired,
  });
}

function clean<F extends string>(errors: Record<F, string | undefined>): Errors<F> {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as Errors<F>;
}

export type FormFailure<F extends string> = { fields: Errors<F>; form: string | null };

/**
 * Reparte un error del backend entre los campos del formulario (`details[].field`) y un mensaje
 * general. Lo que no es de un campo (captcha, credenciales, límite de intentos) va arriba.
 */
export function failureFrom<F extends string>(error: unknown, fields: readonly F[]): FormFailure<F> {
  if (error instanceof NotConsumerError) return { fields: {}, form: t.notConsumer };
  if (error instanceof ApiError) {
    if (error.code === AUTH_ERROR_CODES.invalidCredentials) return { fields: {}, form: t.invalidCredentials };
    if (error.code === AUTH_ERROR_CODES.captchaInvalid) return { fields: {}, form: t.captcha };
    if (error.status === 409 && (fields as readonly string[]).includes("email")) {
      return { fields: { email: t.emailTaken } as Errors<F>, form: null };
    }
    const { fieldErrors, formErrors } = fieldErrorsFrom(error, fields);
    if (Object.keys(fieldErrors).length > 0) return { fields: fieldErrors, form: formErrors[0] ?? null };
  }
  return { fields: {}, form: errorMessage(error) };
}
