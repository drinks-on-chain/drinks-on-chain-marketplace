import { Suspense } from "react";
import { AuthScreen } from "@/components/account/auth-screen";
import { privateMetadata, requireAccountFlag } from "@/lib/account/flag";
import { es } from "@/lib/i18n/es";

export const metadata = privateMetadata(es.account.login.title);

// 2B · Entrar con correo y contraseña (A-13). Solo con la bandera de la cuenta.
export default function Page() {
  requireAccountFlag();
  return (
    <Suspense fallback={null}>
      <AuthScreen initialMode="login" />
    </Suspense>
  );
}
