import { TextLink } from "@drinks-on-chain/ui";
import { es } from "@/lib/i18n/es";
import { links } from "@/lib/links";

/** Pie de descubrimiento: enlaces a los otros sitios (solo si su host está configurado). */
export function SiteFooter() {
  const external: { href: string; label: string }[] = [];
  if (links.landing) external.push({ href: links.landing, label: es.footer.landing });
  if (links.bodegas) external.push({ href: links.bodegas, label: es.footer.wineries });

  return (
    <footer className="mt-12 border-t border-border px-5 py-8 text-center md:mt-20 md:px-8">
      {external.length > 0 ? (
        <ul className="m-0 flex list-none flex-wrap justify-center gap-x-8 gap-y-1 p-0">
          {external.map((item) => (
            <li key={item.href}>
              <TextLink href={item.href} className="inline-flex min-h-11 items-center text-md">
                {item.label}
              </TextLink>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="m-0 mt-3 font-text text-sm text-fg-muted italic">{es.footer.legal}</p>
    </footer>
  );
}
