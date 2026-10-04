import type { Metadata } from "next";
import { CollectionScreen } from "@/components/catalog/collection-screen";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";

export async function generateMetadata({ params }: PageProps<"/catalogo/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: es.catalog.title, alternates: { canonical: routes.collection(slug) } };
}

// 2A · Ficha de una colección ([BORRADOR §17.1]).
export default async function CollectionPage({ params }: PageProps<"/catalogo/[slug]">) {
  const { slug } = await params;
  return <CollectionScreen slug={slug} />;
}
