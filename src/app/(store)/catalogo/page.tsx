import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogScreen } from "@/components/catalog/catalog-screen";
import { CollectionGridSkeleton } from "@/components/catalog/collection-grid";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";

export const metadata: Metadata = {
  title: es.catalog.title,
  description: es.catalog.lead,
  alternates: { canonical: routes.catalog },
};

// 2A · Catálogo sin cuenta, contra el BORRADOR `/v1/public/collections` (contrato §17.1).
// Los filtros viven en la URL, así que la pantalla lee `useSearchParams` dentro de `Suspense`.
export default function CatalogPage() {
  return (
    <Suspense fallback={<CollectionGridSkeleton count={8} className="px-5 py-10 md:px-8 md:py-14" />}>
      <CatalogScreen />
    </Suspense>
  );
}
