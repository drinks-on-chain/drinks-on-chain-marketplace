import type { Metadata } from "next";
import { WineriesScreen } from "@/components/wineries/wineries-screen";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";

export const metadata: Metadata = {
  title: es.wineries.title,
  description: es.wineries.lead,
  alternates: { canonical: routes.wineries },
};

export default function WineriesPage() {
  return <WineriesScreen />;
}
