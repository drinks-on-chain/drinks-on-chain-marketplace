import { Suspense } from "react";
import { OrdersScreen } from "@/components/checkout/orders-screen";
import { privateMetadata, requireAccountFlag } from "@/lib/account/flag";
import { es } from "@/lib/i18n/es";

export const metadata = privateMetadata(es.orders.title);

// 2C · Historial de pedidos ([BORRADOR §13.1]). Solo con la bandera de la cuenta.
export default function Page() {
  requireAccountFlag();
  return (
    <Suspense fallback={null}>
      <OrdersScreen />
    </Suspense>
  );
}
