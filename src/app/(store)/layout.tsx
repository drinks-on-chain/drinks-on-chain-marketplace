import { SiteFooter } from "@/components/site-footer";
import { StoreFrame } from "@/components/store-frame";

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return <StoreFrame footer={<SiteFooter />}>{children}</StoreFrame>;
}
