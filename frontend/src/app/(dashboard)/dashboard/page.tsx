"use client";

import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dashboardService } from "@/services/dashboard-service";
import { orderService } from "@/services/order-service";
import { inventoryService } from "@/services/inventory-service";
import { formatVND, timeAgo } from "@/lib/utils";

const statusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  completed: { label: "Hoàn thành", variant: "default" },
  pending: { label: "Chờ xử lý", variant: "secondary" },
  cancelled: { label: "Đã hủy", variant: "destructive" },
  refunded: { label: "Hoàn tiền", variant: "outline" },
};

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboardService.getSummary(),
  });

  const { data: recentOrdersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders", "recent"],
    queryFn: () => orderService.list({ page: 1, limit: 5 }),
  });

  const { data: lowStockData, isLoading: lowStockLoading } = useQuery({
    queryKey: ["inventory", "low-stock"],
    queryFn: () => inventoryService.getLowStock({ page: 1, limit: 5 }),
  });

  const stats = [
    {
      title: "Doanh thu hôm nay",
      value: summary ? formatVND(summary.today_revenue) : "—",
      change: summary ? `${summary.revenue_change >= 0 ? "+" : ""}${summary.revenue_change.toFixed(1)}%` : "",
      trend: (summary?.revenue_change ?? 0) >= 0 ? ("up" as const) : ("down" as const),
      icon: DollarSign,
    },
    {
      title: "Đơn hàng hôm nay",
      value: summary?.today_orders?.toString() ?? "—",
      change: summary ? `${summary.order_change >= 0 ? "+" : ""}${summary.order_change.toFixed(1)}%` : "",
      trend: (summary?.order_change ?? 0) >= 0 ? ("up" as const) : ("down" as const),
      icon: ShoppingCart,
    },
    {
      title: "Tồn kho thấp",
      value: summary?.low_stock_count?.toString() ?? "—",
      change: "",
      trend: "down" as const,
      icon: AlertTriangle,
    },
    {
      title: "Doanh thu tháng",
      value: summary ? formatVND(summary.month_revenue) : "—",
      change: summary ? `${summary.month_orders} đơn` : "",
      trend: "up" as const,
      icon: Package,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Tổng quan hoạt động kinh doanh hôm nay
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  {summaryLoading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    <p className="text-2xl font-bold">{stat.value}</p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              {stat.change && !summaryLoading && (
                <div className="flex items-center gap-1 mt-2 text-sm">
                  {stat.trend === "up" ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={stat.trend === "up" ? "text-green-600" : "text-red-600"}>
                    {stat.change}
                  </span>
                  <span className="text-muted-foreground">so với hôm qua</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg">Đơn hàng gần đây</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/orders">
                Xem tất cả <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã đơn</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thời gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : recentOrdersData?.data?.length ? (
                  recentOrdersData.data.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium font-mono text-sm">
                        {order.order_number}
                      </TableCell>
                      <TableCell>
                        {order.customer?.full_name || "Khách lẻ"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatVND(order.total_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusMap[order.status]?.variant || "secondary"}>
                          {statusMap[order.status]?.label || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {timeAgo(order.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Chưa có đơn hàng nào
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Low stock alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg">Sắp hết hàng</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/inventory">
                Xem tất cả <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {lowStockLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-6 w-12" />
                </div>
              ))
            ) : lowStockData?.data?.length ? (
              lowStockData.data.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.product_name || "Không rõ"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.variant_name && item.variant_name !== "Default" ? item.variant_name : item.sku}
                    </p>
                    <p className="text-xs text-muted-foreground">Tồn: {item.available_qty}</p>
                  </div>
                  <Badge variant="destructive" className="shrink-0">
                    {item.available_qty}/{item.min_stock_level}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Không có sản phẩm sắp hết hàng
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
