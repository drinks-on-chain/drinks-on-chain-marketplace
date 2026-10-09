import { Suspense } from "react";
import { ForgotPasswordScreen } from "@/components/account/recovery-screens";
import { privateMetadata, requireAccountFlag } from "@/lib/account/flag";
import { es } from "@/lib/i18n/es";

export const metadata = privateMetadata(es.account.forgot.title);

// 2B · Pedir el enlace para recuperar la contraseña.
export default function Page() {
  requireAccountFlag();
  return (
    <Suspense fallback={null}>
      <ForgotPasswordScreen />
    </Suspense>
  );
}
