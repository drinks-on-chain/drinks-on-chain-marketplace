"use client";

import { Input, cn, type InputProps } from "@drinks-on-chain/ui";

// Pendiente de mover a @drinks-on-chain/ui (campo de código de botella o de lote).

/**
 * Campo para escribir el código de la etiqueta: grande (táctil), en mayúsculas a la vista, con
 * las cifras alineadas y sin que el teclado corrija ni autocomplete lo que se escribe. El valor
 * se guarda tal como se teclea; `parseCode` lo normaliza.
 */
export function CodeInput({ className, ...props }: Omit<InputProps, "size" | "numeric" | "giant">) {
  return (
    <Input
      size="lg"
      autoComplete="off"
      autoCapitalize="characters"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="search"
      maxLength={120}
      {...props}
      className={cn("tabular tracking-[0.08em] uppercase", className)}
    />
  );
}
