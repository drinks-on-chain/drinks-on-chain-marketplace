import { cn } from "@drinks-on-chain/ui";
import { fmtBob } from "@/lib/format";
import { es } from "@/lib/i18n/es";

// Pendiente de mover a @drinks-on-chain/ui (`PriceTag`, 05 §3.2).

export type Price = { amountMinor: number; currency: "BOB" } | null;

/**
 * Precio en oro para texto. El precio llega de la colección y **puede faltar** (A-32): entonces
 * se escribe "Precio por anunciar", nunca una cifra inventada.
 */
export function PriceTag({ price, size = "md", className }: { price: Price; size?: "md" | "lg"; className?: string }) {
  if (!price) {
    return (
      <span className={cn("font-display text-fg-muted italic", size === "lg" ? "text-xl" : "text-md", className)}>
        {es.catalog.priceTba}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "font-display font-medium text-accent-text lining-nums",
        size === "lg" ? "text-4xl" : "text-xl",
        className,
      )}
    >
      {fmtBob(price.amountMinor)}
    </span>
  );
}
