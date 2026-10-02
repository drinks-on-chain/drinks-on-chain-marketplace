import type { Metadata, Viewport } from "next";
import { env } from "@/lib/env";
import { es } from "@/lib/i18n/es";
import { links } from "@/lib/links";
import { PAPER } from "@/lib/theme";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: links.app ? new URL(links.app) : undefined,
  title: { default: es.app.title, template: `%s · ${es.app.name}` },
  description: es.app.description,
  applicationName: es.app.name,
  // PWA: el manifest sale de `src/app/manifest.ts`; en iOS, "Añadir a inicio" usa estos datos.
  appleWebApp: { capable: true, title: es.app.name, statusBarStyle: "default" },
  formatDetection: { telephone: false },
  // Con datos de demostración (mocks) nada se indexa. Con el backend real se indexa todo salvo
  // lo que cada página excluya (los códigos de botella nunca: contrato §12.5).
  robots: env.mocks ? { index: false, follow: false } : { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: PAPER,
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  // `safe-area` de las pestañas inferiores del StoreShell en teléfonos con muesca.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" data-theme="oro">
      <body className="min-h-dvh bg-bg font-ui text-fg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
