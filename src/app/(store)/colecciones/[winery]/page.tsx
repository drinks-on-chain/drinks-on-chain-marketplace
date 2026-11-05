import type { Metadata } from "next";
import { CollectionBySlugScreen } from "@/components/catalog/collection-screen";
import { es } from "@/lib/i18n/es";

// Dirección antigua de la ficha (`/colecciones/{slug}`; `/catalogo/{slug}` redirige aquí). El
// segmento es el `slug` de la colección, no una bodega: se busca en el catálogo y, si una sola
// bodega lo tiene, se lleva a `/colecciones/{slugBodega}/{slug}`. Nunca se indexa.
export const metadata: Metadata = { title: es.catalog.title, robots: { index: false, follow: false } };

export default async function CollectionBySlugPage({ params }: PageProps<"/colecciones/[winery]">) {
  const { winery: slug } = await params;
  return <CollectionBySlugScreen slug={slug} />;
}
