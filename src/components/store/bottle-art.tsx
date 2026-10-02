import type { LotProductType } from "@drinks-on-chain/mocks";
import { cn } from "@drinks-on-chain/ui";

// Pendiente de mover a @drinks-on-chain/ui (ilustración de `BottleCard`, maqueta 02-marketplace).

const SHAPES: Record<LotProductType, { body: string; labels: string }> = {
  // Singani: hombros rectos. Vino: hombros caídos (bordelesa).
  SINGANI: {
    body: "M16 4h8v18c0 4 8 8 8 16v70c0 4-2 8-6 8H14c-4 0-6-4-6-8V38c0-8 8-12 8-16z",
    labels: "M10 60h20M10 78h20",
  },
  WINE: {
    body: "M15 4h10v20c0 6 7 10 7 18v66c0 4-2 8-6 8H14c-4 0-6-4-6-8V42c0-8 7-12 7-18z",
    labels: "M10 62h20M10 80h20",
  },
};

/** Botella a tinta con la etiqueta en oro. Decorativa: va cuando la colección no tiene fotografía. */
export function BottleArt({ productType, className }: { productType: LotProductType; className?: string }) {
  const shape = SHAPES[productType];
  return (
    <svg
      viewBox="0 0 40 120"
      fill="none"
      strokeWidth={1.2}
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("h-full w-auto", className)}
    >
      <path d={shape.body} className="stroke-fg-muted" />
      <path d={shape.labels} className="stroke-accent" />
    </svg>
  );
}
