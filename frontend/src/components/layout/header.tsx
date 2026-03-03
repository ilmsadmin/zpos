"use client";

import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { NotificationDropdown } from "@/components/notification-dropdown";

export function Header() {
  return (
    <header className="flex items-center gap-4 h-16 px-4 md:px-6 border-b bg-card">
      {/* Mobile sidebar trigger */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Mở menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm sản phẩm, đơn hàng..."
            className="pl-9 bg-muted/50"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <NotificationDropdown />
      </div>
    </header>
  );
}
