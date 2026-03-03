"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Warehouse,
  Shield,
  BarChart3,
  Settings,
  Truck,
  Monitor,
  ClipboardList,
  LogOut,
  ChevronDown,
  FolderTree,
  UserCog,
  PackagePlus,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Bán hàng (POS)", href: "/dashboard/pos", icon: Monitor },
  { name: "Quản lý ca", href: "/dashboard/pos/sessions", icon: Clock },
  { name: "Đơn hàng", href: "/dashboard/orders", icon: ShoppingCart },
  { name: "Sản phẩm", href: "/dashboard/products", icon: Package },
  { name: "Danh mục", href: "/dashboard/categories", icon: FolderTree },
  { name: "Kho hàng", href: "/dashboard/inventory", icon: Warehouse },
  { name: "Nhập hàng", href: "/dashboard/purchase-orders", icon: PackagePlus },
  { name: "Kiểm kê", href: "/dashboard/stocktake", icon: ClipboardList },
  { name: "Khách hàng", href: "/dashboard/customers", icon: Users },
  { name: "Nhà cung cấp", href: "/dashboard/suppliers", icon: Truck },
  { name: "Bảo hành", href: "/dashboard/warranties", icon: Shield },
  { name: "Nhân viên", href: "/dashboard/users", icon: UserCog },
  { name: "Vai trò", href: "/dashboard/roles", icon: Shield },
  { name: "Báo cáo", href: "/dashboard/reports", icon: BarChart3 },
  { name: "Cài đặt", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <div className="flex flex-col h-full w-64 bg-card border-r">
      {/* Logo */}
      <div className="flex items-center gap-2 h-16 px-6 border-b">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">Z+</span>
        </div>
        <span className="font-bold text-lg">Zplus POS</span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-1">
          {navigation.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Section */}
      <div className="border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-2 px-3"
            >
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium truncate">
                  {user?.full_name || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.role?.display_name || user?.email}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
              <UserCog className="mr-2 h-4 w-4" />
              Hồ sơ cá nhân
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Cài đặt
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
