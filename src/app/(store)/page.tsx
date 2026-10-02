import Link from "next/link";
import { Badge, BrandSeal, TextLink } from "@drinks-on-chain/ui";
import { CodeEntryForm } from "@/components/code-entry-form";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";

// Portada provisional (O2-MK-1, fase 1): marca, "Verifica una botella" y acceso al catálogo.
// El escaparate de 2A la sustituye cuando haya colecciones.
export default function HomePage() {
  return (
    <div className="px-5 md:px-8">
      <div className="grid gap-10 py-10 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] md:items-center md:gap-16 md:py-20">
        <section aria-labelledby="portada-titulo" className="text-center motion-safe:animate-fade-in md:text-left">
          <BrandSeal size="sm" tagline={es.home.sealTagline} className="md:items-start md:text-left" />
          <h1
            id="portada-titulo"
            className="m-0 mt-8 font-display text-4xl leading-[1.1] font-medium text-balance md:text-6xl"
          >
            {es.home.title}
          </h1>
          <p className="mx-auto mt-5 mb-0 max-w-[46ch] text-lg leading-editorial text-fg-muted md:mx-0">
            {es.home.lead}
          </p>
        </section>

        <section aria-labelledby="verificar-titulo" className="rounded-lg border border-border bg-bg-raised p-5 md:p-8">
          <h2 id="verificar-titulo" className="m-0 font-display text-2xl font-medium md:text-3xl">
            {es.home.verifyTitle}
          </h2>
          <p className="m-0 mt-1 text-md text-fg-muted">{es.home.verifyBody}</p>
          <CodeEntryForm className="mt-5" />
        </section>
      </div>

      <section aria-labelledby="catalogo-titulo" className="border-t border-border py-10 md:py-14">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="catalogo-titulo" className="m-0 font-display text-2xl font-medium md:text-3xl">
            {es.home.catalogTitle}
          </h2>
          <Badge>{es.common.soon}</Badge>
        </div>
        <p className="mt-2 mb-0 max-w-[52ch] text-lg leading-editorial text-fg-muted">{es.home.catalogBody}</p>
        <TextLink asChild className="mt-3 inline-flex min-h-11 items-center text-lg">
          <Link href={routes.catalog}>{es.home.catalogLink}</Link>
        </TextLink>
      </section>
    </div>
  );
}
