"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { LabLimitSchema } from "@drinks-on-chain/mocks";
import { Download, FileText, ShieldCheck } from "lucide-react";
import { Alert, Badge, Button, Spinner, TextLink, cn } from "@drinks-on-chain/ui";
import { z } from "zod";
import { apiHref } from "@/lib/api/paths";
import { fmtDate, fmtDecimal, fmtNumber, shortHash } from "@/lib/format";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";
import type { BottleProofQuery } from "@/lib/passport/hooks";
import { lotOf, type BottlePassport, type LotPassport, type Passport } from "@/lib/passport/types";
import { CodeEntryForm } from "../code-entry-form";
import { JourneyTimeline } from "../store/journey-timeline";

// Pasaporte público de una botella o de un lote (contrato de la Ola 2 §12.5). Solo pinta lo que
// llega: donde el pasaporte trae `null` o `NOT_RECORDED` se escribe "No registrado"; nunca un
// valor inventado. De las personas solo sale el rol. Sin reseñas, precio ni NFT (otras olas).

const t = es.passport;

// ─── Piezas de presentación ──────────────────────────────────────────────────────────────────

/** "No registrado", distinguible de un dato real. */
function NotRecorded() {
  return <span className="text-fg-muted italic">{es.common.notRecorded}</span>;
}

/** Valor o "No registrado" si falta (`null`, `undefined` o texto vacío). */
function orNotRecorded(value: ReactNode | null | undefined): ReactNode {
  return value === null || value === undefined || value === "" ? <NotRecorded /> : value;
}

const date = (iso: string | null | undefined) => (iso ? fmtDate(iso) : null);

function Section({
  id,
  title,
  aside,
  children,
}: {
  id: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="border-t border-border pt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id={id} className="m-0 font-display text-2xl leading-tight font-medium md:text-3xl">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

type Fact = { term: string; value: ReactNode | null | undefined };

/** Lista de datos: rótulo pequeño encima y valor debajo; lo que falta, "No registrado". */
function Facts({ items, className }: { items: Fact[]; className?: string }) {
  return (
    <dl className={cn("m-0 grid gap-x-8 gap-y-4 md:grid-cols-2", className)}>
      {items.map((item) => (
        <div key={item.term}>
          <dt className="font-ui text-xs font-medium tracking-label text-fg-subtle uppercase">{item.term}</dt>
          <dd className="m-0 mt-0.5 text-lg leading-snug">{orNotRecorded(item.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

// ─── Avisos ──────────────────────────────────────────────────────────────────────────────────

function Notices({ passport }: { passport: Passport }) {
  const lot = lotOf(passport);
  const voided = passport.kind === "BOTTLE" && passport.bottle.status === "VOIDED";
  if (!voided && lot.stage !== "DISCARDED" && lot.winery.active) return null;
  return (
    <div className="grid gap-3">
      {voided ? (
        <Alert tone="danger" title={t.voidedTitle}>
          {t.voidedBody}
        </Alert>
      ) : null}
      {lot.stage === "DISCARDED" ? (
        <Alert tone="warning" title={t.discardedTitle}>
          {t.discardedBody}
        </Alert>
      ) : null}
      {lot.winery.active ? null : (
        <Alert tone="warning" title={t.wineryInactiveTitle}>
          {t.wineryInactiveBody}
        </Alert>
      )}
    </div>
  );
}

// ─── Qué identifica el código ────────────────────────────────────────────────────────────────

function Identity({ passport, fromBottle }: { passport: Passport; fromBottle: string | null }) {
  if (passport.kind === "BOTTLE") {
    const { bottle, lot } = passport;
    return (
      <div className="rounded-lg border border-border bg-bg-raised p-5 text-center md:p-8">
        <p className="m-0 font-display text-3xl leading-tight font-medium lining-nums md:text-4xl">
          {t.bottleSerial(fmtNumber(bottle.serial), fmtNumber(bottle.lotTotal))}
        </p>
        <p className="m-0 mt-3 font-ui text-xs font-medium tracking-label text-fg-subtle uppercase">{t.bottleCode}</p>
        <p
          className={cn(
            "tabular m-0 font-ui text-xl font-medium tracking-[0.08em]",
            bottle.status === "VOIDED" && "text-danger-text line-through",
          )}
        >
          {bottle.codeFormatted}
        </p>
        <TextLink asChild variant="inline" className="mt-3 inline-flex min-h-11 items-center text-md">
          <Link href={routes.lotFromBottle(lot.lotCode, bottle.code)}>{t.toLot}</Link>
        </TextLink>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-bg-raised p-5 text-center md:p-8">
      <p className="m-0 font-display text-2xl leading-tight font-medium md:text-3xl">{t.lotLabel}</p>
      <p className="mx-auto mt-2 mb-0 max-w-[44ch] text-md text-fg-muted">{t.lotLabelBody}</p>
      <p className="m-0 mt-3 font-ui text-xs font-medium tracking-label text-fg-subtle uppercase">{t.lotCode}</p>
      <p className="tabular m-0 font-ui text-xl font-medium tracking-[0.04em] break-words">{passport.lotCode}</p>
      {fromBottle ? (
        <TextLink asChild variant="inline" className="mt-3 inline-flex min-h-11 items-center text-md">
          <Link href={routes.passport(fromBottle)}>{t.backToBottle(fromBottle)}</Link>
        </TextLink>
      ) : null}
    </div>
  );
}

// ─── Comprobación de la botella contra el expediente ─────────────────────────────────────────

/** Resultado, en lenguaje llano, de comprobar el código contra el expediente cerrado. */
export function BottleProofNotice({ passport, proof }: { passport: BottlePassport; proof: BottleProofQuery }) {
  const { state, retry } = proof;
  // Un código anulado no entra en el expediente: el aviso de anulación ya lo dice todo.
  if (passport.bottle.status === "VOIDED") return null;

  if (state.status === "none") {
    return passport.lot.dossier.status === "CLOSED" ? null : <Alert tone="neutral">{t.proof.openBody}</Alert>;
  }
  if (state.status === "checking") {
    return (
      <div role="status" className="flex items-center gap-3 font-ui text-sm text-fg-muted">
        <Spinner decorative />
        {t.proof.checking}
      </div>
    );
  }
  if (state.status === "verified") {
    return (
      <Alert tone="success" icon={<ShieldCheck aria-hidden />} title={t.proof.verifiedTitle}>
        {t.proof.verifiedBody}
      </Alert>
    );
  }
  if (state.status === "mismatch") {
    return state.reason === "root" ? (
      <Alert tone="danger" title={t.proof.mismatchRootTitle}>
        {t.proof.mismatchRootBody}
      </Alert>
    ) : (
      <Alert
        tone="warning"
        title={t.proof.mismatchHashTitle}
        action={
          <Button variant="tertiary" onClick={retry}>
            {es.common.retry}
          </Button>
        }
      >
        {t.proof.mismatchHashBody}
      </Alert>
    );
  }
  if (state.status === "failed") {
    return (
      <Alert
        tone="warning"
        action={
          <Button variant="tertiary" onClick={retry}>
            {es.common.retry}
          </Button>
        }
      >
        {t.proof.failedBody}
      </Alert>
    );
  }
  return <Alert tone="neutral">{t.proof.unsupportedBody}</Alert>;
}

// ─── Expediente ──────────────────────────────────────────────────────────────────────────────

export type DossierDownload = { onDownload: () => void; pending: boolean; failed: boolean };

function Dossier({ lot, download }: { lot: LotPassport; download: DossierDownload }) {
  const { dossier } = lot;
  const closed = dossier.status === "CLOSED";
  return (
    <Section
      id="expediente"
      title={t.dossierTitle}
      aside={
        <Badge tone={closed ? "success" : "neutral"}>
          {closed ? t.dossierClosed(date(dossier.closedAt) ?? "—") : t.dossierOpen}
        </Badge>
      }
    >
      {closed ? (
        <div className="grid gap-4">
          <Facts
            items={[
              {
                term: t.fingerprint,
                value: dossier.hash ? (
                  <code className="font-mono text-md break-all" title={dossier.hash}>
                    {shortHash(dossier.hash, 8, 8)}
                  </code>
                ) : null,
              },
            ]}
            className="md:grid-cols-1"
          />
          <p className="m-0 text-md text-fg-muted">{t.fingerprintBody}</p>
          {dossier.hash ? (
            <details className="font-ui text-sm">
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-accent-text underline underline-offset-[3px]">
                {t.fingerprintFull}
              </summary>
              <code className="mt-1 block rounded-md bg-bg-sunken p-3 font-mono text-xs break-all">{dossier.hash}</code>
            </details>
          ) : null}
          {dossier.canonicalUrl ? (
            <div className="grid justify-items-start gap-1">
              <Button
                variant="secondary"
                size="lg"
                iconStart={<Download aria-hidden />}
                onClick={download.onDownload}
                loading={download.pending}
              >
                {t.download}
              </Button>
              <p className="m-0 font-ui text-xs text-fg-subtle">{t.downloadHelp}</p>
              {download.failed ? (
                <p role="alert" className="m-0 font-ui text-sm text-danger-text">
                  {t.downloadFailed}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="m-0 text-lg text-fg-muted">{t.dossierOpenBody}</p>
      )}
      <p className="m-0 mt-4 font-ui text-sm text-fg-subtle">{t.anchorPending}</p>
    </Section>
  );
}

// ─── Origen y Denominación de Origen ─────────────────────────────────────────────────────────

const DO_TONE = {
  ELIGIBLE: "success",
  ELIGIBLE_BY_EXCEPTION: "warning",
  NOT_ELIGIBLE: "danger",
  NOT_APPLICABLE: "neutral",
} as const;

function Origin({ lot }: { lot: LotPassport }) {
  const { origin, denomination } = lot;
  return (
    <Section id="origen" title={t.originTitle}>
      {origin.terroirs.length === 0 ? (
        <p className="m-0 text-lg">
          <NotRecorded />
        </p>
      ) : (
        <ul className="m-0 grid list-none gap-4 p-0">
          {origin.terroirs.map((terroir) => (
            <li key={`${terroir.parcelName}-${terroir.variety}`} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <p className="m-0 font-display text-xl leading-tight font-medium">{terroir.parcelName}</p>
                {denomination.applies ? (
                  <Badge tone={DO_TONE[terroir.doStatus]}>{t.doParcel[terroir.doStatus]}</Badge>
                ) : null}
              </div>
              <p className="m-0 mt-1 text-md text-fg-muted">
                {terroir.region} · {t.altitude(fmtNumber(terroir.altitudeMasl))} · {terroir.variety}
              </p>
            </li>
          ))}
        </ul>
      )}

      <h3 className="m-0 mt-6 font-display text-xl font-medium">{t.doTitle}</h3>
      {denomination.applies ? (
        <div className="mt-2 grid gap-2">
          <p className="m-0">
            <Badge tone={DO_TONE[denomination.status]} size="lg">
              {t.doStatuses[denomination.status]}
            </Badge>
          </p>
          {denomination.rules ? (
            <p className="m-0 text-md text-fg-muted">
              {t.doRules(
                fmtNumber(denomination.rules.minAltitudeMasl),
                denomination.rules.requiredVarieties.join(", "),
              )}
            </p>
          ) : null}
          {denomination.legalException ? <p className="m-0 text-md">{t.doException}</p> : null}
        </div>
      ) : (
        <p className="m-0 mt-2 text-md text-fg-muted">{t.doNotApplicable}</p>
      )}
    </Section>
  );
}

// ─── Elaboración: cada etapa aplicable, con sus datos o "No registrado" ──────────────────────

type StageStatus = LotPassport["harvest"]["status"];

function Stage({
  title,
  status,
  facts,
  children,
}: {
  title: string;
  status: StageStatus;
  facts: Fact[];
  children?: ReactNode;
}) {
  // Una etapa que no aplica al producto (crianza en un singani, destilación en un vino) no se pinta.
  if (status === "NOT_APPLICABLE") return null;
  return (
    <li className="rounded-lg border border-border p-4">
      <h3 className="m-0 font-display text-xl leading-tight font-medium">{title}</h3>
      {status === "RECORDED" ? (
        <>
          <Facts items={facts} className="mt-3" />
          {children}
        </>
      ) : (
        <p className="m-0 mt-1 text-lg">
          {status === "PENDING" ? <span className="text-fg-muted italic">{es.common.pending}</span> : <NotRecorded />}
        </p>
      )}
    </li>
  );
}

function Process({ lot }: { lot: LotPassport }) {
  const { harvest, fermentation, aging, distillation, bottling } = lot;
  const range = (from: string | null, to: string | null) => {
    const a = date(from);
    const b = date(to);
    return a && b ? t.dateRange(a, b) : (a ?? b);
  };
  return (
    <Section id="elaboracion" title={t.processTitle}>
      <ol className="m-0 grid list-none gap-4 p-0">
        <Stage
          title={t.stages.harvest}
          status={harvest.status}
          facts={[
            { term: t.fields.intake, value: range(harvest.firstIntakeDate, harvest.lastIntakeDate) },
            {
              term: t.fields.phytosanitary,
              value: harvest.phytosanitary === "APPROVED" ? t.fields.phytoApproved : null,
            },
            {
              term: t.fields.maturity,
              value: harvest.maturity
                ? t.maturity(
                    fmtDecimal(harvest.maturity.brixDegrees),
                    fmtDecimal(harvest.maturity.ph),
                    fmtDecimal(harvest.maturity.acidityGl),
                  )
                : null,
            },
          ]}
        />
        <Stage
          title={t.stages.fermentation}
          status={fermentation.status}
          facts={[
            { term: t.fields.start, value: date(fermentation.startDate) },
            { term: t.fields.end, value: date(fermentation.endDate) },
            { term: t.fields.readings, value: fmtNumber(fermentation.readingsCount) },
          ]}
        >
          <div className="mt-4">
            <p className="m-0 font-ui text-xs font-medium tracking-label text-fg-subtle uppercase">
              {t.fields.treatments}
            </p>
            {fermentation.treatments.length === 0 ? (
              <p className="m-0 mt-0.5 text-lg text-fg-muted">{t.fields.noTreatments}</p>
            ) : (
              <ul className="m-0 mt-1 grid list-none gap-2 p-0">
                {fermentation.treatments.map((treatment) => (
                  <li key={`${treatment.type}-${treatment.appliedAt}`} className="text-md">
                    <span className="text-lg">{t.treatments[treatment.type] ?? treatment.type}</span>
                    <span className="block text-fg-muted">
                      {treatment.additive} · {t.fields.authorization} {treatment.regulatoryAuthCode} ·{" "}
                      {fmtDate(treatment.appliedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Stage>
        <Stage
          title={t.stages.aging}
          status={aging.status}
          facts={[
            {
              term: t.fields.container,
              value: [aging.containerType, aging.containerMaterial].filter(Boolean).join(" · ") || null,
            },
            {
              term: t.fields.plannedMonths,
              value: aging.plannedMonths === null ? null : t.months(aging.plannedMonths),
            },
            { term: t.fields.start, value: date(aging.startDate) },
            { term: t.fields.unlockDate, value: date(aging.unlockDate) },
          ]}
        />
        <Stage
          title={t.stages.distillation}
          status={distillation.status}
          facts={[
            { term: t.fields.start, value: date(distillation.startDate) },
            { term: t.fields.end, value: date(distillation.endDate) },
            {
              term: t.fields.heartAbv,
              value: distillation.heartAbvPercent === null ? null : t.abv(fmtDecimal(distillation.heartAbvPercent)),
            },
            {
              term: t.fields.restMinDays,
              value: distillation.restMinDays === null ? null : t.days(fmtNumber(distillation.restMinDays)),
            },
            { term: t.fields.restUntil, value: date(distillation.restUntil) },
          ]}
        />
        <Stage
          title={t.stages.bottling}
          status={bottling.status}
          facts={[
            { term: t.fields.bottlingDate, value: date(bottling.date) },
            { term: t.fields.bottles, value: bottling.bottles === null ? null : fmtNumber(bottling.bottles) },
            { term: t.fields.format, value: bottling.formatCl === null ? null : t.centiliters(bottling.formatCl) },
            {
              term: t.fields.finalAbv,
              value: bottling.finalAbv === null ? null : t.abv(fmtDecimal(bottling.finalAbv)),
            },
          ]}
        />
      </ol>
    </Section>
  );
}

// ─── Laboratorio ─────────────────────────────────────────────────────────────────────────────

const LAB_TONE = {
  CONFORMING: "success",
  NON_CONFORMING: "danger",
  INCOMPLETE: "warning",
  NOT_RECORDED: "neutral",
} as const;
const CHECK_TONE = { PASS: "success", FAIL: "danger", MISSING: "warning", UNIT_UNKNOWN: "warning" } as const;

type LabLimit = z.infer<typeof LabLimitSchema>;

/** "máx. 300 mg/100 ml a.a." (y el mínimo, si lo hay). */
function limitText(limit: LabLimit): string {
  const parts = [
    limit.min === undefined ? null : t.limitMin(fmtDecimal(limit.min), limit.unidad),
    limit.max === undefined ? null : t.limitMax(fmtDecimal(limit.max), limit.unidad),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : t.noLimit;
}

const parameterLabel = (key: string) => t.labParameters[key] ?? key;

function Lab({ lot }: { lot: LotPassport }) {
  const { lab } = lot;
  return (
    <Section
      id="laboratorio"
      title={t.labTitle}
      aside={
        <Badge tone={LAB_TONE[lab.status]} size="lg">
          {t.labStatuses[lab.status]}
        </Badge>
      }
    >
      {lab.status === "NOT_RECORDED" ? (
        <p className="m-0 text-lg text-fg-muted">{t.labNotRecordedBody}</p>
      ) : (
        <>
          <Facts
            items={[
              { term: t.laboratory, value: lab.laboratoryName },
              { term: t.testedAt, value: date(lab.testedAt) },
            ]}
          />
          {lab.checks.length > 0 ? (
            <ul className="m-0 mt-5 grid list-none gap-0 p-0">
              {lab.checks.map((check) => (
                <li
                  key={check.parameter}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border py-3"
                >
                  <div className="min-w-0">
                    <p className="m-0 text-lg leading-snug">{parameterLabel(check.parameter)}</p>
                    <p className="m-0 font-ui text-sm text-fg-muted">
                      <span className="tabular text-fg">
                        {check.value === null ? es.common.notRecorded : `${fmtDecimal(check.value)} ${check.unit}`}
                      </span>
                      {" · "}
                      {check.limit ? limitText(check.limit) : t.noLimit}
                    </p>
                  </div>
                  <Badge tone={CHECK_TONE[check.result]}>{t.labResults[check.result]}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </Section>
  );
}

// ─── Reglas del lote ─────────────────────────────────────────────────────────────────────────

const limitsSchema = z.record(z.string(), LabLimitSchema);

/** Valor de una regla de la instantánea, sea cifra, sí/no, lista o los límites de laboratorio. */
function ruleValue(value: unknown, unit: string | null): ReactNode {
  if (value === null || value === undefined) return <NotRecorded />;
  if (typeof value === "boolean") return value ? es.common.yes : es.common.no;
  if (typeof value === "number") return `${fmtDecimal(value)}${unit ? ` ${unit}` : ""}`;
  if (typeof value === "string") return `${value}${unit ? ` ${unit}` : ""}`;
  if (Array.isArray(value)) return value.map(String).join(", ") || <NotRecorded />;
  const limits = limitsSchema.safeParse(value);
  if (limits.success) {
    return (
      <ul className="m-0 grid list-none gap-0.5 p-0">
        {Object.entries(limits.data).map(([key, limit]) => (
          <li key={key}>
            {parameterLabel(key)}: {limitText(limit)}
          </li>
        ))}
      </ul>
    );
  }
  // Una forma que no se conoce no se interpreta: consta en el expediente.
  return <NotRecorded />;
}

function Rules({ lot }: { lot: LotPassport }) {
  const { rules } = lot;
  return (
    <Section id="reglas" title={t.rulesTitle}>
      <p className="m-0 text-md text-fg-muted">
        {rules.origin === "MIGRATION" ? t.rulesMigration : t.rulesTakenAt(fmtDate(rules.takenAt))}
      </p>
      <dl className="m-0 mt-4 grid gap-0">
        {rules.items.map((item) => (
          <div key={item.key} className="grid gap-1 border-t border-border py-3 md:grid-cols-2 md:gap-6">
            <dt className="text-md text-fg-muted">
              {item.label}
              {item.legalException ? (
                <Badge tone="warning" className="ml-2 align-middle">
                  {t.legalException}
                </Badge>
              ) : null}
            </dt>
            <dd className="m-0 text-lg leading-snug">{ruleValue(item.value, item.unit)}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

// ─── Documentos públicos ─────────────────────────────────────────────────────────────────────

function Attachments({ lot }: { lot: LotPassport }) {
  // La URL llega en los datos (ruta de la API o URL absoluta): solo se enlaza lo que se puede abrir.
  const attachments = lot.publicAttachments.flatMap((attachment) => {
    const href = apiHref(attachment.url);
    return href ? [{ ...attachment, href }] : [];
  });
  if (attachments.length === 0) return null;
  return (
    <Section id="documentos" title={t.attachmentsTitle}>
      <ul className="m-0 grid list-none gap-1 p-0">
        {attachments.map((attachment) => (
          <li key={attachment.id}>
            {/* La API responde un 302 a una URL firmada de corta vida (§12.1). */}
            <a
              href={attachment.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-sm text-lg text-accent-text underline underline-offset-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <FileText aria-hidden className="size-4 shrink-0" />
              <span>
                {attachment.title}
                <span className="text-fg-muted">
                  {" "}
                  · {t.attachmentKinds[attachment.kind] ?? t.attachmentKinds.OTHER}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ─── Documento ───────────────────────────────────────────────────────────────────────────────

export type PassportDocumentProps = {
  passport: Passport;
  /** Código de la botella desde la que se llegó al lote (enlace de vuelta). */
  fromBottle?: string | null;
  /** Comprobación de la botella contra el expediente (se ignora en un pasaporte de lote). */
  proof: BottleProofQuery;
  download: DossierDownload;
};

/** El pasaporte entero: cabecera, qué identifica el código, avisos y las secciones del lote. */
export function PassportDocument({ passport, fromBottle = null, proof, download }: PassportDocumentProps) {
  const lot = lotOf(passport);
  return (
    <article className="mx-auto w-full max-w-[46rem] px-5 py-10 md:px-8 md:py-16">
      <header className="mb-8 text-center">
        <p className="m-0 font-display text-sm tracking-[0.3em] text-fg-muted uppercase">
          {es.productTypes[lot.productType]} · {t.vintage(lot.vintage)}
        </p>
        <span aria-hidden="true" className="mx-auto my-4 block h-8 w-px bg-rule" />
        <h1 className="m-0 font-display text-4xl leading-[1.1] font-medium break-words text-balance lining-nums md:text-5xl">
          {lot.name}
        </h1>
        <p className="m-0 mt-3 text-lg text-fg-muted">
          {lot.winery.active ? (
            <TextLink asChild variant="inline" className="inline-flex min-h-11 items-center">
              <Link href={routes.winery(lot.winery.slug)} aria-label={t.wineryLink(lot.winery.tradeName)}>
                {lot.winery.tradeName}
              </Link>
            </TextLink>
          ) : (
            lot.winery.tradeName
          )}
          <span className="block">{lot.winery.region}</span>
        </p>
      </header>

      <div className="grid gap-8">
        <Notices passport={passport} />
        <Identity passport={passport} fromBottle={fromBottle} />
        {passport.kind === "BOTTLE" ? <BottleProofNotice passport={passport} proof={proof} /> : null}
        <Dossier lot={lot} download={download} />
        <Origin lot={lot} />
        <Process lot={lot} />
        <Section id="registro" title={t.timelineTitle}>
          <JourneyTimeline events={lot.timeline} />
          <p className="m-0 mt-5 text-md text-fg-muted">
            {t.corrections(lot.corrections.count, date(lot.corrections.lastAt))}
          </p>
        </Section>
        <Lab lot={lot} />
        <Rules lot={lot} />
        <Attachments lot={lot} />

        <section aria-labelledby="otro-codigo" className="rounded-lg border border-border bg-bg-raised p-5 md:p-8">
          <h2 id="otro-codigo" className="m-0 font-display text-2xl font-medium">
            {passport.kind === "LOT" && !fromBottle ? t.haveBottleTitle : t.anotherTitle}
          </h2>
          {passport.kind === "LOT" && !fromBottle ? (
            <p className="m-0 mt-1 text-md text-fg-muted">{t.haveBottleBody}</p>
          ) : null}
          <div className="mt-5">
            <CodeEntryForm key={passport.kind === "BOTTLE" ? passport.bottle.code : passport.lotCode} />
          </div>
        </section>
      </div>
    </article>
  );
}
