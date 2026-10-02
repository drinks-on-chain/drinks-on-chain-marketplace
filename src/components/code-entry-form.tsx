"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@drinks-on-chain/ui";
import { formatBottleCode } from "@/lib/codes/bottle-code";
import { malformedMessage } from "@/lib/codes/messages";
import { parseCode, type MalformedCode, type ValidCode } from "@/lib/codes/parse";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";

export type CodeEntryFormProps = {
  /** Texto con el que arranca el campo (p. ej. el código mal escrito de la URL). */
  initialValue?: string;
  /** Error con el que arranca (el visor llega con un código mal escrito). */
  initialProblem?: MalformedCode | null;
  className?: string;
};

/**
 * Entrada manual del código de la etiqueta (botella o lote). Valida en el cliente con
 * `parseCode` (§7.1) y navega al visor con el código canónico; si está mal escrito, marca el
 * campo, explica por qué y, cuando hay una sola corrección probable, la ofrece.
 * Familia operativa (Inter): nunca serif dentro de un formulario.
 */
export function CodeEntryForm({ initialValue = "", initialProblem = null, className }: CodeEntryFormProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);
  const [problem, setProblem] = useState<MalformedCode | null>(initialProblem);
  const [pending, startTransition] = useTransition();

  function open(code: ValidCode) {
    setProblem(null);
    startTransition(() => router.push(routes.passport(code.code)));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseCode(value);
    if (parsed.kind === "malformed") {
      setProblem(parsed);
      inputRef.current?.focus();
      return;
    }
    open(parsed);
  }

  function applySuggestion(suggestion: string) {
    const parsed = parseCode(suggestion);
    if (parsed.kind === "malformed") return;
    setValue(parsed.formatted);
    open(parsed);
  }

  const suggestion = problem?.suggestion ? formatBottleCode(problem.suggestion) : null;

  return (
    <form onSubmit={onSubmit} noValidate className={className}>
      <div className="grid gap-4 font-ui">
        <Field
          label={es.verify.label}
          help={es.verify.help}
          // `role="alert"`: el error se anuncia al aparecer aunque el foco ya esté en el campo.
          error={problem ? <span role="alert">{malformedMessage(problem)}</span> : undefined}
        >
          <Input
            ref={inputRef}
            name="code"
            size="lg"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (problem) setProblem(null);
            }}
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            maxLength={120}
            className="tracking-[0.08em] uppercase placeholder:tracking-normal placeholder:normal-case"
          />
        </Field>

        {suggestion ? (
          <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
            {es.verify.suggestion}
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="tabular"
              onClick={() => applySuggestion(suggestion)}
              disabled={pending}
            >
              {es.verify.useSuggestion(suggestion)}
            </Button>
          </p>
        ) : null}

        <Button type="submit" size="lg" block loading={pending}>
          {es.verify.submit}
        </Button>
      </div>
    </form>
  );
}
