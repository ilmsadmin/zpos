"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const pathLabels: Record<string, string> = {
  dashboard: "Dashboard",
  pos: "Bán hàng",
  sessions: "Quản lý ca",
  orders: "Đơn hàng",
  products: "Sản phẩm",
  create: "Tạo mới",
  edit: "Chỉnh sửa",
  categories: "Danh mục",
  inventory: "Kho hàng",
  movements: "Lịch sử",
  "purchase-orders": "Nhập hàng",
  stocktake: "Kiểm kê",
  customers: "Khách hàng",
  suppliers: "Nhà cung cấp",
  warranties: "Bảo hành",
  users: "Nhân viên",
  roles: "Vai trò",
  reports: "Báo cáo",
  settings: "Cài đặt",
};

interface BreadcrumbProps {
  className?: string;
  /** Custom items to override auto-generated breadcrumbs */
  items?: { label: string; href?: string }[];
}

export function Breadcrumb({ className, items }: BreadcrumbProps) {
  const pathname = usePathname();

  const breadcrumbs = items
    ? items
    : pathname
        .split("/")
        .filter(Boolean)
        .map((segment, index, arr) => {
          const href = "/" + arr.slice(0, index + 1).join("/");
          const label = pathLabels[segment] || segment;
          return { label, href };
        });

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-sm text-muted-foreground", className)}
    >
      <Link
        href="/dashboard"
        className="hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      {breadcrumbs.slice(1).map((item, index, arr) => (
        <span key={index} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          {item.href && index < arr.length - 1 ? (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
