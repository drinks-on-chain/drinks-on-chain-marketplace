"use client";

import type { ReactNode } from "react";
import { BadgeCheck, Hourglass, SearchX, WifiOff } from "lucide-react";
import { Button, EmptyState, ErrorState, Skeleton } from "@drinks-on-chain/ui";
import { waitText } from "@/lib/api/errors";
import type { MalformedCode, ValidCode } from "@/lib/codes/parse";
import { es } from "@/lib/i18n/es";
import { usePassport } from "@/lib/passport/hooks";
import type { PassportQuery } from "@/lib/passport/types";
import { CodeEntryForm } from "./code-entry-form";

/** Columna editorial del visor: rótulo pequeño, hilo y el código como título. */
function PassportColumn({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <article className="mx-auto w-full max-w-[46rem] px-5 py-10 md:px-8 md:py-16">
      <header className="mb-8 text-center md:mb-10">
        <p className="m-0 font-display text-sm tracking-[0.3em] text-fg-muted uppercase">{eyebrow}</p>
        <span aria-hidden="true" className="mx-auto my-4 block h-8 w-px bg-rule" />
        <h1 className="m-0 font-display text-3xl leading-tight font-medium tracking-[0.08em] break-words text-accent-text md:text-4xl">
          {title}
        </h1>
      </header>
      <div className="grid gap-8">{children}</div>
    </article>
  );
}

/** Tarjeta con el formulario para probar otro código. */
function AnotherCode({ title, body, form }: { title: string; body?: string; form: ReactNode }) {
  return (
    <section aria-labelledby="otro-codigo" className="rounded-lg border border-border bg-bg-raised p-5 md:p-8">
      <h2 id="otro-codigo" className="m-0 font-display text-2xl font-medium">
        {title}
      </h2>
      {body ? <p className="m-0 mt-1 font-text text-md text-fg-muted">{body}</p> : null}
      <div className="mt-5">{form}</div>
    </section>
  );
}

function PassportSkeleton() {
  return (
    <div role="status" aria-busy="true" className="grid gap-4">
      <span className="sr-only">{es.passport.loading}</span>
      <Skeleton shape="block" className="h-40" />
      <Skeleton className="w-3/4" />
      <Skeleton className="w-1/2" />
      <Skeleton shape="block" className="h-28" />
    </div>
  );
}

/**
 * Estados del visor para un código bien formado. Recibe la consulta ya resuelta
 * (`PassportQuery`), así se prueba sin red.
 *
 * FASE 2: el estado `found` pinta aquí el pasaporte (§12.5 del contrato: botella o lote,
 * cabecera, origen, `JourneyTimeline`, laboratorio, reglas y expediente).
 */
export function PassportView({ code, query }: { code: ValidCode; query: PassportQuery }) {
  const { state, retry, retrying } = query;
  const isBottle = code.kind === "bottle";
  const another = <AnotherCode title={es.passport.anotherTitle} form={<CodeEntryForm key={code.code} />} />;

  return (
    <PassportColumn eyebrow={isBottle ? es.passport.bottleEyebrow : es.passport.lotEyebrow} title={code.formatted}>
      {state.status === "loading" ? <PassportSkeleton /> : null}

      {state.status === "found" ? (
        <>
          <EmptyState
            role="status"
            icon={<BadgeCheck aria-hidden />}
            title={es.passport.foundTitle}
            description={`${isBottle ? es.passport.foundBottle : es.passport.foundLot} ${es.passport.foundBody}`}
          />
          {another}
        </>
      ) : null}

      {state.status === "not-found" ? (
        <>
          <EmptyState
            role="status"
            icon={<SearchX aria-hidden />}
            title={es.passport.notFoundTitle}
            description={isBottle ? es.passport.notFoundBottle : es.passport.notFoundLot}
          />
          {another}
        </>
      ) : null}

      {state.status === "malformed" ? (
        <AnotherCode
          title={es.passport.malformedTitle}
          body={es.passport.malformedBody}
          form={<CodeEntryForm initialValue={code.formatted} />}
        />
      ) : null}

      {state.status === "rate-limited" ? (
        <EmptyState
          role="alert"
          icon={<Hourglass aria-hidden />}
          title={es.passport.rateLimitedTitle}
          description={es.passport.rateLimitedBody(state.retryAfter ? waitText(state.retryAfter) : null)}
          action={
            <Button variant="secondary" size="lg" onClick={retry} loading={retrying}>
              {es.common.retry}
            </Button>
          }
        />
      ) : null}

      {state.status === "offline" ? (
        <EmptyState
          role="alert"
          icon={<WifiOff aria-hidden />}
          title={es.passport.offlineTitle}
          description={es.passport.offlineBody}
          action={
            <Button variant="secondary" size="lg" onClick={retry} loading={retrying}>
              {es.common.retry}
            </Button>
          }
        />
      ) : null}

      {state.status === "error" ? (
        <ErrorState
          title={es.passport.errorTitle}
          description={es.passport.errorBody}
          onRetry={retry}
          retrying={retrying}
          retryLabel={es.common.retry}
        />
      ) : null}
    </PassportColumn>
  );
}

/** Visor de un código bien formado: consulta el pasaporte y pinta su estado. */
export function PassportViewer({ code }: { code: ValidCode }) {
  const query = usePassport(code.code);
  return <PassportView code={code} query={query} />;
}

/** Visor de un código mal escrito (no se consulta nada): formulario con el motivo y la sugerencia. */
export function MalformedCodeView({ problem }: { problem: MalformedCode }) {
  return (
    <PassportColumn eyebrow={es.passport.unknownEyebrow} title={es.passport.malformedTitle}>
      <AnotherCode
        title={es.verify.title}
        body={es.passport.malformedBody}
        form={<CodeEntryForm initialValue={problem.input} initialProblem={problem} />}
      />
    </PassportColumn>
  );
}
