import { PassportNotFound } from "@/components/passport/server-passport-view";

// Un código de lote que el backend no conoce: `notFound()` responde 404 (y `noindex`) con el
// mismo aviso del visor, para que se pueda probar otro código.
export default function PassportNotFoundPage() {
  return <PassportNotFound />;
}
