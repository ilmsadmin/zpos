import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tra cứu bảo hành - Zplus POS",
  description: "Tra cứu thông tin bảo hành sản phẩm bằng mã bảo hành, số serial hoặc số điện thoại",
};

export default function WarrantyLookupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
