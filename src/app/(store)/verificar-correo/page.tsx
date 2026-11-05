import { Suspense } from "react";
import { VerifyEmailScreen } from "@/components/account/recovery-screens";
import { privateMetadata, requireAccountFlag } from "@/lib/account/flag";
import { es } from "@/lib/i18n/es";

export const metadata = privateMetadata(es.account.verify.title);

// 2B · Confirmar el correo con el enlace recibido (`?token=`) o pedir otro.
export default function Page() {
  requireAccountFlag();
  return (
    <Suspense fallback={null}>
      <VerifyEmailScreen />
    </Suspense>
  );
}
