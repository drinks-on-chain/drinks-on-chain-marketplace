"use client";

import type { ReactNode } from "react";
import { Alert, cn } from "@drinks-on-chain/ui";
import { es } from "@/lib/i18n/es";

// Piezas comunes de los formularios de la cuenta. Familia operativa (Inter): nunca serif dentro
// de un formulario; el título de la página sí va en Cormorant.

/** Columna de una pantalla de la cuenta: título de página y contenido operativo. */
export function AccountColumn({
  title,
  lead,
  children,
  className,
}: {
  title: string;
  lead?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[30rem] px-5 py-10 font-ui md:px-8 md:py-16", className)}>
      <header className="mb-6">
        <h1 className="m-0 font-display text-4xl leading-tight font-medium">{title}</h1>
        {lead ? <p className="mt-2 mb-0 text-md text-fg-muted">{lead}</p> : null}
      </header>
      {children}
    </div>
  );
}

/** Error general del formulario (credenciales, captcha, límite de intentos): se anuncia al aparecer. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <Alert tone="danger">{message}</Alert>;
}

/** El mensaje de error de un campo, anunciado (`Field` no le pone `role="alert"`). */
export const fieldError = (message: string | undefined) => (message ? <span role="alert">{message}</span> : undefined);

/**
 * Campo trampa: las personas no lo ven ni llegan a él con el teclado o el lector de pantalla; un
 * robot que rellene todo, sí. Debe viajar vacío (si no, el backend responde "aceptado" y no hace nada).
 */
export function Honeypot({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
      <label>
        {es.account.honeypot}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  );
}
