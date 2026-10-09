import { Suspense } from "react";
import { AccountScreen } from "@/components/account/account-screen";
import { privateMetadata, requireAccountFlag } from "@/lib/account/flag";
import { es } from "@/lib/i18n/es";

export const metadata = privateMetadata(es.account.profile.title);

// 2B · Perfil con la dirección informativa de solo lectura ([BORRADOR §13.1]).
export default function Page() {
  requireAccountFlag();
  return (
    <Suspense fallback={null}>
      <AccountScreen />
    </Suspense>
  );
}
