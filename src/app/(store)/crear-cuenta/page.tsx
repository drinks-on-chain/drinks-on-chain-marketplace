import { Suspense } from "react";
import { AuthScreen } from "@/components/account/auth-screen";
import { privateMetadata, requireAccountFlag } from "@/lib/account/flag";
import { es } from "@/lib/i18n/es";

export const metadata = privateMetadata(es.account.signup.title);

// 2B · Crear cuenta con correo ([BORRADOR §13.1]). Solo con la bandera de la cuenta.
export default function Page() {
  requireAccountFlag();
  return (
    <Suspense fallback={null}>
      <AuthScreen initialMode="signup" />
    </Suspense>
  );
}
