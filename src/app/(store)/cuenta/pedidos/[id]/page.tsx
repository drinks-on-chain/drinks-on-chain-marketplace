import { OrderScreen } from "@/components/checkout/orders-screen";
import { privateMetadata, requireAccountFlag } from "@/lib/account/flag";
import { es } from "@/lib/i18n/es";

export const metadata = privateMetadata(es.orders.detailTitle);

// 2C · Un pedido: su pago y, con el pago recibido, sus botellas ([BORRADOR §13.1]).
export default async function Page({ params }: PageProps<"/cuenta/pedidos/[id]">) {
  requireAccountFlag();
  const { id } = await params;
  return <OrderScreen id={id} />;
}
