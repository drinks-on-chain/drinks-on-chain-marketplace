"use client";

import type { ReactNode } from "react";
import { CircleCheck, CircleDashed, CircleHelp, CircleX, ShieldCheck } from "lucide-react";
import { Alert, Badge, Button, ChainAddress, ExplorerLink, Spinner, cn, isHttpUrl } from "@drinks-on-chain/ui";
import { fmtDate, fmtDateTime, fmtNumber } from "@/lib/format";
import { es } from "@/lib/i18n/es";
import type { AnchorCheck, DossierAnchor } from "@/lib/passport/anchor";
import type { AnchorVerificationQuery } from "@/lib/passport/hooks";
import type { LotPassport } from "@/lib/passport/types";

// «Anclaje en la red» del visor (contrato de la Ola 3 §7.3, PUB-03). Tres estados, sin adornar:
// sin anclaje, pendiente y anclado. En «anclado» se enseña lo que el visor recalculó en el
// dispositivo, las cuatro comprobaciones (con texto además del color), la cuenta de anclaje y el
// enlace a la transacción, que sale **solo** de `explorerUrl` del backend: aquí no se escribe
// ningún host del explorador.

const t = es.passport.anchor;

const networkName = (network: DossierAnchor["network"]) => t.networks[network] ?? network;

function Term({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="font-ui text-xs font-medium tracking-label text-fg-subtle uppercase">{term}</dt>
      <dd className="m-0 mt-0.5 min-w-0 text-lg leading-snug">{children}</dd>
    </div>
  );
}

/** Huella en monoespaciada, entera y partida en líneas (para compararla a ojo). */
function Hash({ value }: { value: string }) {
  return <code className="block rounded-md bg-bg-sunken p-3 font-mono text-xs break-all">{value}</code>;
}

// ─── Recálculo en el dispositivo ─────────────────────────────────────────────────────────────

function Fingerprint({ lot, query }: { lot: LotPassport; query: AnchorVerificationQuery }) {
  const state = query.fingerprint;
  const retry = (
    <Button variant="tertiary" onClick={query.retryFingerprint}>
      {es.common.retry}
    </Button>
  );

  if (state.status === "idle") return null;
  if (state.status === "checking") {
    return (
      <div role="status" className="flex items-center gap-3 font-ui text-sm text-fg-muted">
        <Spinner decorative />
        {t.fingerprint.checking}
      </div>
    );
  }
  if (state.status === "match") {
    return (
      <Alert tone="success" icon={<ShieldCheck aria-hidden />} title={t.fingerprint.matchTitle}>
        {t.fingerprint.matchBody}
      </Alert>
    );
  }
  if (state.status === "mismatch") {
    const anchor = lot.dossier.anchor;
    return (
      <Alert tone="warning" title={t.fingerprint.mismatchTitle} action={retry}>
        <p className="m-0">
          {state.dossier
            ? t.fingerprint.mismatchMemo
            : state.memo
              ? t.fingerprint.mismatchDossier
              : t.fingerprint.mismatchBoth}
        </p>
        <dl className="m-0 mt-3 grid gap-3">
          <div>
            <dt className="font-ui text-xs font-medium">{t.fingerprint.computed}</dt>
            <dd className="m-0 mt-1">
              <Hash value={state.computed} />
            </dd>
          </div>
          {lot.dossier.hash ? (
            <div>
              <dt className="font-ui text-xs font-medium">{t.fingerprint.published}</dt>
              <dd className="m-0 mt-1">
                <Hash value={lot.dossier.hash} />
              </dd>
            </div>
          ) : null}
          {anchor ? (
            <div>
              <dt className="font-ui text-xs font-medium">{t.fingerprint.anchored}</dt>
              <dd className="m-0 mt-1">
                <Hash value={anchor.memoHashHex} />
              </dd>
            </div>
          ) : null}
        </dl>
        <p className="m-0 mt-3">{t.fingerprint.mismatchAdvice}</p>
      </Alert>
    );
  }
  if (state.status === "failed") {
    return (
      <Alert tone="warning" action={retry}>
        {t.fingerprint.failedBody}
      </Alert>
    );
  }
  return <Alert tone="neutral">{t.fingerprint.unsupportedBody}</Alert>;
}

// ─── Las cuatro comprobaciones ───────────────────────────────────────────────────────────────

/** Resultado con icono, palabra y color: nunca solo el color. */
function CheckResult({ check }: { check: AnchorCheck }) {
  const result =
    check.pass === true
      ? { label: t.results.pass, Icon: CircleCheck, className: "text-success-text" }
      : check.pass === false
        ? { label: t.results.fail, Icon: CircleX, className: "text-danger-text" }
        : check.source === "server"
          ? { label: t.results.notYet, Icon: CircleDashed, className: "text-fg-muted" }
          : { label: t.results.unknown, Icon: CircleHelp, className: "text-fg-muted" };
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 font-ui text-sm font-medium", result.className)}>
      <result.Icon aria-hidden className="size-4 shrink-0" />
      {result.label}
    </span>
  );
}

function Checks({ query }: { query: AnchorVerificationQuery }) {
  const { checks, checksSource, verification } = query;
  return (
    <div>
      <h3 id="anclaje-comprobaciones" className="m-0 font-display text-xl font-medium">
        {t.checksTitle}
      </h3>
      {checksSource === "loading" ? (
        <div role="status" className="mt-3 flex items-center gap-3 font-ui text-sm text-fg-muted">
          <Spinner decorative />
          {t.checksLoading}
        </div>
      ) : (
        <>
          <ul aria-labelledby="anclaje-comprobaciones" className="m-0 mt-2 grid list-none gap-0 p-0">
            {checks.map((check) => (
              <li
                key={check.key}
                className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-t border-border py-3"
              >
                <div className="min-w-0">
                  <p className="m-0 text-lg leading-snug">{t.checks[check.key]}</p>
                  {check.message ? <p className="m-0 font-ui text-sm text-fg-muted">{check.message}</p> : null}
                </div>
                <CheckResult check={check} />
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2 font-ui text-sm text-fg-muted">
            {checksSource === "server"
              ? verification?.verifiedOnChainAt
                ? t.sourceServerAt(fmtDateTime(verification.verifiedOnChainAt))
                : t.sourceServer
              : checksSource === "viewer-after-error"
                ? t.sourceViewerAfterError
                : t.sourceViewer}
          </p>
          {checksSource === "viewer-after-error" ? (
            <Button variant="tertiary" className="mt-1" onClick={query.retryChecks}>
              {es.common.retry}
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}

// ─── Datos de la transacción ─────────────────────────────────────────────────────────────────

function AnchorFacts({ anchor, confirmed }: { anchor: DossierAnchor; confirmed: boolean }) {
  return (
    <dl className="m-0 grid gap-x-8 gap-y-4 md:grid-cols-2">
      <Term term={t.network}>{networkName(anchor.network)}</Term>
      <Term term={t.account}>
        <ChainAddress value={anchor.account} label={t.account} />
      </Term>
      {confirmed && anchor.txHash ? (
        <Term term={t.transaction}>
          <ChainAddress value={anchor.txHash} label={t.transaction} />
        </Term>
      ) : null}
      {confirmed && anchor.ledger !== null ? <Term term={t.ledger}>{fmtNumber(anchor.ledger)}</Term> : null}
    </dl>
  );
}

// ─── Sección ─────────────────────────────────────────────────────────────────────────────────

export function AnchorSection({ lot, query }: { lot: LotPassport; query: AnchorVerificationQuery }) {
  const anchor = lot.dossier.anchor;
  const { stage } = query;
  const anchored = stage === "anchored" && anchor !== null;

  return (
    <section aria-labelledby="anclaje" className="border-t border-border pt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="anclaje" className="m-0 font-display text-2xl leading-tight font-medium md:text-3xl">
          {t.title}
        </h2>
        {anchored ? (
          <Badge tone="success">{anchor.anchoredAt ? t.anchoredOn(fmtDate(anchor.anchoredAt)) : t.anchored}</Badge>
        ) : lot.dossier.status === "CLOSED" ? (
          <Badge tone="info">{es.common.pending}</Badge>
        ) : (
          <Badge tone="neutral">{t.none}</Badge>
        )}
      </div>

      {anchored ? (
        <div className="grid gap-6">
          <p className="m-0 text-lg text-fg-muted">{t.anchoredBody(networkName(anchor.network))}</p>
          <Fingerprint lot={lot} query={query} />
          <Checks query={query} />
          <AnchorFacts anchor={anchor} confirmed />
          {/* El enlace sale solo de `explorerUrl` del backend; sin él, no hay enlace. */}
          {isHttpUrl(anchor.explorerUrl) ? (
            <div className="grid justify-items-start gap-1">
              <ExplorerLink href={anchor.explorerUrl} className="min-h-11 text-md">
                {t.explorer}
              </ExplorerLink>
              <p className="m-0 font-ui text-sm text-fg-subtle">{t.explorerHelp}</p>
            </div>
          ) : null}
        </div>
      ) : lot.dossier.status !== "CLOSED" ? (
        <p className="m-0 text-lg text-fg-muted">{t.noneOpenBody}</p>
      ) : (
        <div className="grid gap-4">
          {/* Expediente cerrado sin anclaje confirmado: lo mismo que decía el visor en la Ola 2. */}
          <p className="m-0 text-lg">{t.pendingLine}</p>
          <p className="m-0 text-md text-fg-muted">
            {anchor ? t.pendingBody(networkName(anchor.network)) : t.noneClosedBody}
          </p>
          {anchor ? <AnchorFacts anchor={anchor} confirmed={false} /> : null}
        </div>
      )}
    </section>
  );
}
