import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { env } from "@/lib/env";

// Bandera de la cuenta (2B) y la compra (2C): `NEXT_PUBLIC_MK_ACCOUNT=1`, apagada por defecto.
// Con ella apagada (producción y previews contra el backend real, que aún no tiene esas rutas)
// sus páginas responden 404 y no hay ni un enlace hacia ellas.

export const accountEnabled = env.account;

/** Para las páginas de la cuenta y de los pedidos: 404 si la bandera está apagada. */
export function requireAccountFlag(): void {
  if (!accountEnabled) notFound();
}

/** Las páginas de la cuenta nunca se indexan. */
export const privateMetadata = (title: string): Metadata => ({ title, robots: { index: false, follow: false } });
