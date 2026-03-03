"use client";

import { useEffect, useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  CheckCheck,
  ShoppingCart,
  PackageX,
  ShieldAlert,
  Wrench,
  BarChart3,
  Info,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { notificationService } from "@/services/notification-service";
import { useNotificationStore } from "@/stores/notification-store";
import { useAuthStore } from "@/stores/auth-store";
import type { NotificationResponse } from "@/types/api";
import { cn } from "@/lib/utils";

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  new_order: <ShoppingCart className="h-4 w-4 text-blue-500" />,
  low_stock: <PackageX className="h-4 w-4 text-amber-500" />,
  warranty_expiry: <ShieldAlert className="h-4 w-4 text-orange-500" />,
  warranty_request: <Wrench className="h-4 w-4 text-indigo-500" />,
  daily_report: <BarChart3 className="h-4 w-4 text-emerald-500" />,
  system: <Info className="h-4 w-4 text-gray-500" />,
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "border-l-blue-500",
  warning: "border-l-amber-500",
  error: "border-l-red-500",
  critical: "border-l-red-700",
};

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: NotificationResponse;
  onMarkRead: (id: string) => void;
}) {
  const icon = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.system;
  const severityColor = SEVERITY_COLORS[notification.severity] || SEVERITY_COLORS.info;

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 border-l-2 transition-colors cursor-pointer hover:bg-muted/50",
        severityColor,
        !notification.is_read && "bg-primary/5"
      )}
      onClick={() => {
        if (!notification.is_read) {
          onMarkRead(notification.id);
        }
      }}
    >
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-sm truncate",
              !notification.is_read ? "font-semibold" : "font-medium text-muted-foreground"
            )}
          >
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
            locale: vi,
          })}
        </p>
      </div>
    </div>
  );
}

export function NotificationDropdown() {
  const { isAuthenticated } = useAuthStore();
  const { unreadCount, setUnreadCount, decrementUnread, clearUnread } =
    useNotificationStore();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Poll unread count every 30s
  const { data: unread } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 30000,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (unread !== undefined) {
      setUnreadCount(unread);
    }
  }, [unread, setUnreadCount]);

  // Fetch notifications when popover is open
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => notificationService.list({ limit: 20 }),
    enabled: open && isAuthenticated,
  });

  const notifications = notificationsData?.data || [];

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      decrementUnread();
      queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      clearUnread();
      queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread-count"],
      });
    },
  });

  const handleMarkRead = useCallback(
    (id: string) => {
      markReadMutation.mutate(id);
    },
    [markReadMutation]
  );

  if (!isAuthenticated) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center font-bold">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Thông báo</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[380px] p-0"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Thông báo</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Đọc tất cả
            </Button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="max-h-[400px]">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Không có thông báo</p>
            </div>
          )}

          {!isLoading &&
            notifications.map((notif: NotificationResponse, index: number) => (
              <div key={notif.id}>
                <NotificationItem
                  notification={notif}
                  onMarkRead={handleMarkRead}
                />
                {index < notifications.length - 1 && <Separator />}
              </div>
            ))}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2 text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground w-full"
              onClick={() => setOpen(false)}
            >
              Xem tất cả thông báo
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
