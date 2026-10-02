import type { Metadata } from "next";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";
import type { LotPassport } from "./types";

// Metadatos de la página de un lote (título, descripción y Open Graph), a partir de su pasaporte.
// Solo datos registrados: lo que el pasaporte no trae no se menciona.

/** "Singani Gran Reserva 2026 · Destilería Cinti Viejo" (la plantilla añade "· Drinks on Chain"). */
export const lotTitle = (lot: LotPassport) => `${lot.name} · ${lot.winery.tradeName}`;

export function lotDescription(lot: LotPassport): string {
  const t = es.passport.meta;
  const parts = [
    t.intro(es.productTypes[lot.productType], lot.vintage, lot.winery.tradeName, lot.winery.region),
    lot.origin.terroirs.length > 0 ? t.origin(lot.origin.terroirs.map((terroir) => terroir.parcelName)) : null,
    lot.bottling.bottles !== null ? t.bottles(lot.bottling.bottles) : null,
    lot.dossier.status === "CLOSED" ? t.dossierClosed : null,
    t.lot(lot.lotCode),
  ];
  return parts.filter(Boolean).join(" ");
}

/** Metadatos de un lote encontrado: indexable, con su URL canónica y su tarjeta al compartir. */
export function lotMetadata(lot: LotPassport): Metadata {
  const title = lotTitle(lot);
  const description = lotDescription(lot);
  const canonical = routes.passport(lot.lotCode);
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      siteName: es.app.name,
      locale: "es_BO",
    },
    twitter: { card: "summary", title, description },
  };
}
