"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleCheck, MailCheck } from "lucide-react";
import { Alert, Button, Field, Input, Spinner, TextLink } from "@drinks-on-chain/ui";
import { AUTH_ERROR_CODES, PASSWORD_MIN_LENGTH } from "@/lib/account/api";
import { useRequestPasswordReset, useResendVerification, useResetPassword, useVerifyEmail } from "@/lib/account/hooks";
import { emailError, failureFrom, newPasswordError } from "@/lib/account/validation";
import { ApiError } from "@/lib/api/errors";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";
import { Captcha } from "./captcha";
import { AccountColumn, FormError, Honeypot, fieldError } from "./form-parts";

// 2B · Recuperar contraseña, elegir una nueva y confirmar el correo. Las rutas
// `/restablecer-contrasena?token=` y `/verificar-correo?token=` son las de los enlaces de los correos.

const t = es.account;

function LoginLink({ label = t.forgot.back }: { label?: string }) {
  return (
    <TextLink asChild variant="inline" className="inline-flex min-h-11 items-center text-sm">
      <Link href={routes.login}>{label}</Link>
    </TextLink>
  );
}

/**
 * Formulario de un solo campo (correo) con captcha y campo trampa: pedir el enlace de
 * recuperación o reenviar el de verificación. El backend responde "aceptado" exista o no la
 * cuenta, y así se dice.
 */
function EmailRequestForm({
  submitLabel,
  sentTitle,
  sentBody,
  pending,
  onRequest,
}: {
  submitLabel: string;
  sentTitle: string;
  sentBody: string;
  pending: boolean;
  onRequest: (
    input: { email: string; captchaToken: string; website: string },
    callbacks: { onSuccess: () => void; onError: (error: unknown) => void },
  ) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = emailError(email);
    setError(invalid);
    setFormError(null);
    if (invalid) return inputRef.current?.focus();
    if (!captchaToken) return setFormError(t.errors.captchaPending);
    onRequest(
      { email: email.trim(), captchaToken, website },
      {
        onSuccess: () => setSent(true),
        onError: (failure) => {
          const { fields, form } = failureFrom<"email">(failure, ["email"]);
          setError(fields.email);
          setFormError(form);
        },
      },
    );
  }

  if (sent) {
    return (
      <div className="grid gap-4">
        <Alert tone="success" icon={<MailCheck aria-hidden />} title={sentTitle}>
          {sentBody}
        </Alert>
        <LoginLink />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative grid gap-4">
      <FormError message={formError} />
      <Field label={t.login.email} required error={fieldError(error)}>
        <Input
          ref={inputRef}
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
      <Honeypot value={website} onChange={setWebsite} />
      <Captcha onToken={setCaptchaToken} />
      <Button type="submit" size="lg" block loading={pending}>
        {submitLabel}
      </Button>
      <LoginLink />
    </form>
  );
}

/** `/recuperar-contrasena`. */
export function ForgotPasswordScreen() {
  const request = useRequestPasswordReset();
  return (
    <AccountColumn title={t.forgot.title} lead={t.forgot.lead}>
      <EmailRequestForm
        submitLabel={t.forgot.submit}
        sentTitle={t.forgot.sentTitle}
        sentBody={t.forgot.sentBody}
        pending={request.isPending}
        onRequest={(input, callbacks) => request.mutate(input, callbacks)}
      />
    </AccountColumn>
  );
}

/** `/restablecer-contrasena?token=…`. */
export function ResetPasswordScreen() {
  const token = useSearchParams().get("token")?.trim() ?? "";
  const inputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const reset = useResetPassword();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = newPasswordError(password);
    setError(invalid);
    setFormError(null);
    if (invalid) return inputRef.current?.focus();
    reset.mutate(
      { token, password },
      {
        onError: (failure) => {
          if (failure instanceof ApiError && failure.code === AUTH_ERROR_CODES.resetTokenInvalid) {
            return setExpired(true);
          }
          const { fields, form } = failureFrom<"password">(failure, ["password"]);
          setError(fields.password);
          setFormError(form);
          inputRef.current?.focus();
        },
      },
    );
  }

  const requestNew = (
    <Button asChild variant="secondary" size="lg">
      <Link href={routes.forgotPassword}>{t.reset.requestNew}</Link>
    </Button>
  );

  return (
    <AccountColumn title={t.reset.title}>
      {!token || expired ? (
        <div className="grid justify-items-start gap-4">
          <Alert tone="warning" title={t.reset.missingTitle}>
            {token ? t.reset.invalid : t.reset.missingBody}
          </Alert>
          {requestNew}
        </div>
      ) : reset.isSuccess ? (
        <div className="grid justify-items-start gap-4">
          <Alert tone="success" icon={<CircleCheck aria-hidden />} title={t.reset.doneTitle}>
            {t.reset.doneBody}
          </Alert>
          <Button asChild size="lg">
            <Link href={routes.login}>{t.login.submit}</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={formError} />
          <Field label={t.reset.password} required help={t.signup.passwordHelp} error={fieldError(error)}>
            <Input
              ref={inputRef}
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              size="lg"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <Button type="submit" size="lg" block loading={reset.isPending}>
            {t.reset.submit}
          </Button>
        </form>
      )}
    </AccountColumn>
  );
}

/**
 * `/verificar-correo`. Con `?token=` confirma el correo al abrir la página; sin él (o si el
 * enlace ya no vale) ofrece pedir otro.
 */
export function VerifyEmailScreen() {
  const token = useSearchParams().get("token")?.trim() ?? "";
  const verify = useVerifyEmail();
  const resend = useResendVerification();
  const { mutate } = verify;
  const started = useRef(false);

  useEffect(() => {
    // Un enlace de un solo uso: se confirma una vez, aunque el efecto se repita en desarrollo.
    if (!token || started.current) return;
    started.current = true;
    mutate(token);
  }, [token, mutate]);

  const invalidLink = verify.error instanceof ApiError && verify.error.code === AUTH_ERROR_CODES.emailTokenInvalid;

  const resendForm = (
    <section aria-labelledby="otro-enlace" className="grid gap-3">
      <h2 id="otro-enlace" className="m-0 font-ui text-lg font-semibold">
        {t.verify.resendTitle}
      </h2>
      <p className="m-0 text-md text-fg-muted">{t.verify.resendLead}</p>
      <EmailRequestForm
        submitLabel={t.verify.resendSubmit}
        sentTitle={t.forgot.sentTitle}
        sentBody={t.verify.resendSent}
        pending={resend.isPending}
        onRequest={(input, callbacks) => resend.mutate(input, callbacks)}
      />
    </section>
  );

  return (
    <AccountColumn title={t.verify.title}>
      {!token ? (
        resendForm
      ) : verify.isSuccess ? (
        <div className="grid justify-items-start gap-4">
          <Alert tone="success" icon={<CircleCheck aria-hidden />} title={t.verify.doneTitle}>
            {verify.data.signedIn ? t.verify.doneSignedIn : t.verify.doneBody}
          </Alert>
          <Button asChild size="lg">
            <Link href={verify.data.signedIn ? routes.account : routes.login}>
              {verify.data.signedIn ? t.navAccount : t.login.submit}
            </Link>
          </Button>
        </div>
      ) : verify.isError ? (
        <div className="grid gap-6">
          <Alert
            tone="warning"
            title={t.verify.invalidTitle}
            action={
              invalidLink ? undefined : (
                <Button variant="tertiary" onClick={() => mutate(token)}>
                  {es.common.retry}
                </Button>
              )
            }
          >
            {invalidLink ? t.verify.invalidBody : t.verify.failedBody}
          </Alert>
          {invalidLink ? resendForm : null}
        </div>
      ) : (
        <div role="status" className="flex items-center gap-3 text-md text-fg-muted">
          <Spinner decorative />
          {t.verify.checking}
        </div>
      )}
    </AccountColumn>
  );
}
