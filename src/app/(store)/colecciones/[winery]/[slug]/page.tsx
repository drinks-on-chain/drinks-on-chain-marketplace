import type { Metadata } from "next";
import { CollectionScreen } from "@/components/catalog/collection-screen";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";

export async function generateMetadata({ params }: PageProps<"/colecciones/[winery]/[slug]">): Promise<Metadata> {
  const { winery, slug } = await params;
  return { title: es.catalog.title, alternates: { canonical: routes.collection(winery, slug) } };
}

// 2A · Ficha de una colección ([BORRADOR §13.1]): `/colecciones/{slugBodega}/{slug}`, la ruta que
// el backend escribe en `external_url` de cada NFT.
export default async function CollectionPage({ params }: PageProps<"/colecciones/[winery]/[slug]">) {
  const { winery, slug } = await params;
  return <CollectionScreen winerySlug={winery} slug={slug} />;
}
