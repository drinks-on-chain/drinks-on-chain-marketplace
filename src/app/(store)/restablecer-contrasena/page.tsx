import { Suspense } from "react";
import { ResetPasswordScreen } from "@/components/account/recovery-screens";
import { privateMetadata, requireAccountFlag } from "@/lib/account/flag";
import { es } from "@/lib/i18n/es";

export const metadata = privateMetadata(es.account.reset.title);

// 2B · Elegir una contraseña nueva con el enlace del correo (`?token=`).
export default function Page() {
  requireAccountFlag();
  return (
    <Suspense fallback={null}>
      <ResetPasswordScreen />
    </Suspense>
  );
}
