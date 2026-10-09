"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Alert, Button, Checkbox, Field, Input, TextLink } from "@drinks-on-chain/ui";
import { PASSWORD_MIN_LENGTH } from "@/lib/account/api";
import { useLogin, useSignup } from "@/lib/account/hooks";
import {
  failureFrom,
  validateLogin,
  validateSignup,
  type Errors,
  type LoginFields,
  type SignupFields,
} from "@/lib/account/validation";
import { es } from "@/lib/i18n/es";
import { links, routes } from "@/lib/links";
import { Captcha } from "./captcha";
import { FormError, Honeypot, fieldError } from "./form-parts";

// 2B · Entrar y crear cuenta, solo con correo y contraseña (A-13): sin passkeys, SMS ni
// proveedores sociales. Los dos formularios sirven en su página (`/entrar`, `/crear-cuenta`) y
// dentro del checkout (`AuthPanel` en una hoja), así que no navegan: avisan con `onAuthenticated`.

const t = es.account;

export type AuthMode = "login" | "signup";

/** Pone el foco en el primer campo con error (los ids son los `name` de los campos). */
function focusFirst(form: HTMLFormElement | null, names: readonly string[]) {
  const name = names[0];
  if (name) form?.querySelector<HTMLElement>(`[name="${name}"], #${CSS.escape(`campo-${name}`)}`)?.focus();
}

export function LoginForm({ onAuthenticated, onSwitch }: { onAuthenticated: () => void; onSwitch: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors<LoginFields>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const login = useLogin();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = validateLogin({ email, password });
    setErrors(invalid);
    setFormError(null);
    if (Object.keys(invalid).length > 0) return focusFirst(formRef.current, Object.keys(invalid));
    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: onAuthenticated,
        onError: (error) => {
          const failure = failureFrom<LoginFields>(error, ["email", "password"]);
          setErrors(failure.fields);
          setFormError(failure.form);
          focusFirst(formRef.current, Object.keys(failure.fields).length ? Object.keys(failure.fields) : ["email"]);
        },
      },
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid gap-4 font-ui">
      <FormError message={formError} />
      <Field label={t.login.email} required error={fieldError(errors.email)}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          size="lg"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      <Field label={t.login.password} required error={fieldError(errors.password)}>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          size="lg"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>
      <Button type="submit" size="lg" block loading={login.isPending}>
        {t.login.submit}
      </Button>
      <p className="m-0 text-sm">
        <TextLink asChild variant="inline" className="inline-flex min-h-11 items-center">
          <Link href={routes.forgotPassword}>{t.login.forgot}</Link>
        </TextLink>
      </p>
      <p className="m-0 flex flex-wrap items-center gap-x-2 border-t border-border pt-4 text-sm text-fg-muted">
        {t.login.noAccount}
        <Button type="button" variant="tertiary" size="lg" onClick={onSwitch}>
          {t.login.toSignup}
        </Button>
      </p>
    </form>
  );
}

export function SignupForm({ onAuthenticated, onSwitch }: { onAuthenticated: () => void; onSwitch: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState({ fullName: "", email: "", password: "" });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [ageDeclaration, setAgeDeclaration] = useState(false);
  const [website, setWebsite] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [errors, setErrors] = useState<Errors<SignupFields>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const signup = useSignup();

  const set = (field: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = validateSignup({ ...values, acceptTerms, ageDeclaration });
    setErrors(invalid);
    setFormError(null);
    if (Object.keys(invalid).length > 0) return focusFirst(formRef.current, Object.keys(invalid));
    if (!captchaToken) return setFormError(t.errors.captchaPending);
    const email = values.email.trim();
    signup.mutate(
      {
        fullName: values.fullName.trim(),
        email,
        password: values.password,
        acceptTerms: true,
        ageDeclaration: true,
        captchaToken,
        website,
      },
      {
        onSuccess: (outcome) => (outcome.kind === "signed-in" ? onAuthenticated() : setSentTo(email)),
        onError: (error) => {
          const failure = failureFrom<SignupFields>(error, ["fullName", "email", "password"]);
          setErrors(failure.fields);
          setFormError(failure.form);
          focusFirst(formRef.current, Object.keys(failure.fields));
        },
      },
    );
  }

  // [BORRADOR §13.1] Alta con verificación: no hay sesión hasta confirmar el correo.
  if (sentTo) {
    return (
      <div className="grid gap-4 font-ui">
        <Alert tone="success" icon={<MailCheck aria-hidden />} title={t.signup.sentTitle}>
          {t.signup.sentBody(sentTo)}
        </Alert>
        <Button type="button" size="lg" block onClick={onSwitch}>
          {t.signup.toLogin}
        </Button>
        <TextLink asChild variant="inline" className="inline-flex min-h-11 items-center text-sm">
          <Link href={routes.verifyEmail}>{t.signup.sentResend}</Link>
        </TextLink>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="relative grid gap-4 font-ui">
      <FormError message={formError} />
      <Field label={t.signup.fullName} required error={fieldError(errors.fullName)}>
        <Input name="fullName" autoComplete="name" size="lg" value={values.fullName} onChange={set("fullName")} />
      </Field>
      <Field label={t.signup.email} required error={fieldError(errors.email)}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          size="lg"
          value={values.email}
          onChange={set("email")}
        />
      </Field>
      <Field label={t.signup.password} required help={t.signup.passwordHelp} error={fieldError(errors.password)}>
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          size="lg"
          value={values.password}
          onChange={set("password")}
        />
      </Field>

      <div className="grid gap-1">
        <Checkbox
          id="campo-acceptTerms"
          label={t.signup.terms}
          checked={acceptTerms}
          onCheckedChange={(checked) => setAcceptTerms(checked === true)}
          invalid={Boolean(errors.acceptTerms)}
          aria-describedby={errors.acceptTerms ? "error-acceptTerms" : undefined}
          className="min-h-11"
        />
        {links.terms && links.privacy ? (
          <p className="m-0 flex flex-wrap gap-x-4 pl-7 text-sm">
            <TextLink
              href={links.terms}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center"
            >
              {t.signup.termsLink}
            </TextLink>
            <TextLink
              href={links.privacy}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center"
            >
              {t.signup.privacyLink}
            </TextLink>
          </p>
        ) : null}
        {errors.acceptTerms ? (
          <p id="error-acceptTerms" role="alert" className="m-0 pl-7 text-sm text-danger-text">
            {errors.acceptTerms}
          </p>
        ) : null}
      </div>

      <div className="grid gap-1">
        <Checkbox
          id="campo-ageDeclaration"
          label={t.signup.age}
          description={t.signup.ageHelp}
          checked={ageDeclaration}
          onCheckedChange={(checked) => setAgeDeclaration(checked === true)}
          invalid={Boolean(errors.ageDeclaration)}
          aria-describedby={errors.ageDeclaration ? "error-ageDeclaration" : undefined}
          className="min-h-11"
        />
        {errors.ageDeclaration ? (
          <p id="error-ageDeclaration" role="alert" className="m-0 pl-7 text-sm text-danger-text">
            {errors.ageDeclaration}
          </p>
        ) : null}
      </div>

      <Honeypot value={website} onChange={setWebsite} />
      <Captcha onToken={setCaptchaToken} />

      <Button type="submit" size="lg" block loading={signup.isPending}>
        {t.signup.submit}
      </Button>
      <p className="m-0 flex flex-wrap items-center gap-x-2 border-t border-border pt-4 text-sm text-fg-muted">
        {t.signup.haveAccount}
        <Button type="button" variant="tertiary" size="lg" onClick={onSwitch}>
          {t.signup.toLogin}
        </Button>
      </p>
    </form>
  );
}

/**
 * Entrar o crear cuenta en un mismo sitio, con el cambio de uno a otro sin salir. `heading` deja
 * poner el título que toque (un `h1` en la página; el de la hoja, en el checkout).
 */
export function AuthPanel({
  initialMode = "login",
  onAuthenticated,
  onModeChange,
}: {
  initialMode?: AuthMode;
  onAuthenticated: () => void;
  onModeChange?: (mode: AuthMode) => void;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const change = (next: AuthMode) => {
    setMode(next);
    onModeChange?.(next);
  };
  return mode === "login" ? (
    <LoginForm onAuthenticated={onAuthenticated} onSwitch={() => change("signup")} />
  ) : (
    <SignupForm onAuthenticated={onAuthenticated} onSwitch={() => change("login")} />
  );
}
