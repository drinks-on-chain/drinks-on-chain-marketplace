import type { Metadata } from "next";
import Link from "next/link";
import { Wine } from "lucide-react";
import { Badge, Button, EmptyState } from "@drinks-on-chain/ui";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";

export const metadata: Metadata = { title: es.catalog.title };

// 2A llega en la fase 2 (catálogo sin cuenta contra los mocks). Hasta entonces, un aviso sobrio.
export default function CatalogPage() {
  return (
    <div className="mx-auto w-full max-w-[46rem] px-5 py-10 md:px-8 md:py-16">
      <header className="mb-8 flex flex-wrap items-center justify-center gap-3 text-center">
        <h1 className="m-0 font-display text-4xl leading-tight font-medium md:text-5xl">{es.catalog.title}</h1>
        <Badge>{es.common.soon}</Badge>
      </header>
      <EmptyState
        icon={<Wine aria-hidden />}
        title={es.catalog.soonTitle}
        description={es.catalog.soonBody}
        action={
          <Button asChild size="lg">
            <Link href={routes.verify}>{es.catalog.verify}</Link>
          </Button>
        }
      />
    </div>
  );
}
