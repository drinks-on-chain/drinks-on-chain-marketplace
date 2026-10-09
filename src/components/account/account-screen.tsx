"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
import { Alert, Badge, Button, ChainAddress, ErrorState, ExplorerLink, isHttpUrl } from "@drinks-on-chain/ui";
import type { ConsumerProfile } from "@/lib/account/api";
import { useConsumerProfile, useLogout, useSessionStatus } from "@/lib/account/hooks";
import { errorMessage } from "@/lib/api/errors";
import { fmtDate } from "@/lib/format";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";
import { AuthPanel } from "./auth-forms";
import { AccountSkeleton } from "./auth-screen";
import { AccountColumn } from "./form-parts";

// 2B · Perfil del consumidor ([BORRADOR §13.1], `GET /v1/me/consumer`) con la dirección
// informativa de solo lectura (A-28): la gestiona Drinks on Chain. Aquí no hay claves, ni frases
// de recuperación, ni nada que firmar; tampoco se dice "wallet".

const t = es.account;

/**
 * Lo que solo se ve con sesión. Mientras se recupera la sesión, un esqueleto; sin sesión, el
 * formulario para entrar **en la misma página** (no se pierde la dirección a la que se iba).
 */
export function AccountGate({ title, children }: { title: string; children: ReactNode }) {
  const status = useSessionStatus();
  if (status === "authenticated") return <>{children}</>;
  return (
    <AccountColumn
      title={status === "anonymous" ? t.gate.title : title}
      lead={status === "anonymous" ? t.gate.body : undefined}
    >
      {status === "anonymous" ? <AuthPanel onAuthenticated={() => {}} /> : <AccountSkeleton />}
    </AccountColumn>
  );
}

/**
 * `AddressReadOnly` (pendiente de mover a `@drinks-on-chain/ui`): la dirección custodial del
 * consumidor, solo para leer. El enlace al explorador es el `explorerUrl` que entrega el backend.
 */
export function AddressReadOnly({ address }: { address: ConsumerProfile["address"] }) {
  return (
    <section aria-labelledby="direccion" className="grid gap-3 rounded-lg border border-border bg-bg-raised p-5">
      <h2 id="direccion" className="m-0 font-ui text-lg font-semibold">
        {t.address.title}
      </h2>
      <p className="m-0 text-md">{t.address.body}</p>
      {address ? (
        <>
          <dl className="m-0">
            <dt className="text-xs font-medium tracking-label text-fg-subtle uppercase">{t.address.label}</dt>
            <dd className="m-0 mt-1">
              <ChainAddress value={address.address} label={t.address.label} />
            </dd>
          </dl>
          <p className="m-0 text-sm text-fg-muted">
            {t.address.detail(es.passport.anchor.networks[address.network] ?? address.network)}
          </p>
          {isHttpUrl(address.explorerUrl) ? (
            <ExplorerLink href={address.explorerUrl} className="min-h-11 justify-self-start text-sm">
              {t.address.explorer}
            </ExplorerLink>
          ) : null}
        </>
      ) : (
        <p className="m-0 text-sm text-fg-muted">{t.address.none}</p>
      )}
    </section>
  );
}

export function ProfileView({
  profile,
  onLogout,
  loggingOut,
}: {
  profile: ConsumerProfile;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const notices = Object.entries(t.profile.noticeLabels) as [keyof ConsumerProfile["preferences"], string][];
  return (
    <div className="grid gap-6">
      <section aria-labelledby="datos" className="grid gap-3">
        <h2 id="datos" className="sr-only">
          {t.profile.title}
        </h2>
        <dl className="m-0 grid gap-3">
          <div>
            <dt className="text-xs font-medium tracking-label text-fg-subtle uppercase">{t.profile.name}</dt>
            <dd className="m-0 mt-0.5 text-lg">{profile.fullName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-label text-fg-subtle uppercase">{t.profile.email}</dt>
            <dd className="m-0 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg">
              <span className="break-all">{profile.email}</span>
              <Badge tone={profile.emailVerified ? "success" : "warning"}>
                {profile.emailVerified ? t.profile.verified : t.profile.unverified}
              </Badge>
            </dd>
          </div>
        </dl>
        <p className="m-0 text-sm text-fg-muted">{t.profile.since(fmtDate(profile.createdAt))}</p>
        {profile.emailVerified ? null : (
          <Alert
            tone="warning"
            action={
              <Button asChild variant="tertiary">
                <Link href={routes.verifyEmail}>{t.profile.unverifiedAction}</Link>
              </Button>
            }
          >
            {t.profile.unverifiedBody}
          </Alert>
        )}
      </section>

      <Link
        href={routes.orders}
        className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-border bg-bg-raised p-5 text-fg no-underline hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <span>
          <span className="block text-lg font-semibold">{t.profile.orders}</span>
          <span className="block text-sm text-fg-muted">{t.profile.ordersBody}</span>
        </span>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-fg-muted" />
      </Link>

      <AddressReadOnly address={profile.address} />

      <section aria-labelledby="avisos" className="grid gap-2">
        <h2 id="avisos" className="m-0 font-ui text-lg font-semibold">
          {t.profile.notices}
        </h2>
        <ul className="m-0 grid list-none gap-0 p-0">
          {notices.map(([key, label]) => (
            <li key={key} className="flex items-center justify-between gap-4 border-t border-border py-3 text-md">
              <span>{label}</span>
              <span className="text-sm text-fg-muted">{profile.preferences[key] ? t.profile.on : t.profile.off}</span>
            </li>
          ))}
        </ul>
      </section>

      <Button
        variant="secondary"
        size="lg"
        iconStart={<LogOut aria-hidden />}
        onClick={onLogout}
        loading={loggingOut}
        className="justify-self-start"
      >
        {t.profile.logout}
      </Button>
    </div>
  );
}

/** `/cuenta`. */
export function AccountScreen() {
  const router = useRouter();
  const profile = useConsumerProfile();
  const logout = useLogout();
  return (
    <AccountGate title={t.profile.title}>
      <AccountColumn title={t.profile.title}>
        {profile.isPending ? (
          <AccountSkeleton />
        ) : profile.isError ? (
          <ErrorState
            title={t.profile.errorTitle}
            description={errorMessage(profile.error)}
            onRetry={() => void profile.refetch()}
            retrying={profile.isRefetching}
            retryLabel={es.common.retry}
          />
        ) : (
          <ProfileView
            profile={profile.data}
            loggingOut={logout.isPending}
            onLogout={() => logout.mutate(undefined, { onSettled: () => router.push(routes.home) })}
          />
        )}
      </AccountColumn>
    </AccountGate>
  );
}
