"use client";

import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn, useFieldControl } from "@drinks-on-chain/ui";

// Pendiente de mover a @drinks-on-chain/ui (selector nativo para pantallas táctiles).
//
// En el teléfono el selector del sistema es más cómodo que una lista propia, y no deja contenido
// enfocable bajo `aria-hidden` mientras está abierto (lo que axe señala en el `Select` del paquete,
// basado en Radix). Mismo aspecto que los campos del sistema; se conecta al `Field` que lo envuelve.

export type NativeSelectOption = { value: string; label: string };

export interface NativeSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  options: NativeSelectOption[];
}

export function NativeSelect({ options, className, ...props }: NativeSelectProps) {
  const control = useFieldControl(props);
  return (
    <span className="relative block">
      <select
        {...props}
        {...control}
        className={cn(
          "min-h-14 w-full cursor-pointer appearance-none rounded-md border border-border-strong bg-bg-raised py-2 pr-11 pl-3 font-ui text-lg text-fg",
          "focus:border-accent focus:outline-2 focus:outline-offset-1 focus:outline-focus",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-fg-muted"
      />
    </span>
  );
}
