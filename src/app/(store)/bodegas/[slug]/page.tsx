import type { Metadata } from "next";
import { WineryScreen } from "@/components/wineries/winery-screen";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";

export async function generateMetadata({ params }: PageProps<"/bodegas/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: es.wineries.title, alternates: { canonical: routes.winery(slug) } };
}

export default async function WineryPage({ params }: PageProps<"/bodegas/[slug]">) {
  const { slug } = await params;
  return <WineryScreen slug={slug} />;
}
