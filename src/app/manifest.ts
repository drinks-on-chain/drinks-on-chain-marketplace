import type { MetadataRoute } from "next";
import { es } from "@/lib/i18n/es";
import { routes } from "@/lib/links";
import { PAPER } from "@/lib/theme";

// PWA básica (2F): instalable con manifest e iconos. Sin service worker propio: los navegadores
// ya no lo exigen para instalar, y con `NEXT_PUBLIC_MOCKS=1` el ámbito raíz lo ocupa el de MSW.
// El modo sin conexión de la cava llega en la Ola 4.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: es.app.name,
    short_name: es.app.name,
    description: es.app.description,
    lang: "es",
    dir: "ltr",
    start_url: routes.home,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: PAPER,
    theme_color: PAPER,
    categories: ["food", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: es.verify.title, url: routes.verify }],
  };
}
