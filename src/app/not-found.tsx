import type { Metadata } from "next";
import Link from "next/link";
import { Button, EmptyState } from "@drinks-on-chain/ui";
import { SiteFooter } from "@/components/site-footer";
import { StoreFrame } from "@/components/store-frame";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";

// Sin `robots`: Next ya añade `noindex` a toda página de no encontrado (una sola etiqueta).
export const metadata: Metadata = { title: es.errors.notFoundTitle };

export default function NotFound() {
  return (
    <StoreFrame footer={<SiteFooter />}>
      <div className="mx-auto w-full max-w-[46rem] px-5 py-10 md:px-8 md:py-16">
        <h1 className="sr-only">{es.app.name}</h1>
        <EmptyState
          title={es.errors.notFoundTitle}
          description={es.errors.notFoundBody}
          action={
            <Button asChild size="lg">
              <Link href={routes.home}>{es.common.backHome}</Link>
            </Button>
          }
        />
      </div>
    </StoreFrame>
  );
}
