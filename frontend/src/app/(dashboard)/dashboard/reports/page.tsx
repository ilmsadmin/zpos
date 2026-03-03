"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { dashboardService } from "@/services/dashboard-service";
import { formatVND } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

export default function ReportsPage() {
  const [days, setDays] = useState(7);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => dashboardService.getSummary(),
  });

  const { data: salesChart, isLoading: chartLoading } = useQuery({
    queryKey: ["sales-chart", days],
    queryFn: () => dashboardService.getSalesChart(days),
  });

  const { data: topProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["top-products"],
    queryFn: () => dashboardService.getTopProducts(10),
  });

  const periodLabel: Record<number, string> = {
    1: "Hôm nay",
    7: "7 ngày",
    30: "30 ngày",
    90: "90 ngày",
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Báo cáo" description="Phân tích doanh thu và hoạt động kinh doanh">
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Hôm nay</SelectItem>
            <SelectItem value="7">7 ngày qua</SelectItem>
            <SelectItem value="30">30 ngày qua</SelectItem>
            <SelectItem value="90">90 ngày qua</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Doanh thu tháng</p>
                {summaryLoading ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{formatVND(summary?.month_revenue || 0)}</p>
                )}
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
            {summary && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${summary.revenue_change >= 0 ? "text-green-600" : "text-red-600"}`}>
                <TrendingUp className="w-4 h-4" />
                {summary.revenue_change >= 0 ? "+" : ""}{summary.revenue_change.toFixed(1)}% so với hôm qua
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đơn hàng tháng</p>
                {summaryLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{summary?.month_orders || 0}</p>
                )}
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            {summary && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${summary.order_change >= 0 ? "text-green-600" : "text-red-600"}`}>
                <TrendingUp className="w-4 h-4" />
                {summary.order_change >= 0 ? "+" : ""}{summary.order_change.toFixed(1)}% so với hôm qua
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Doanh thu hôm nay</p>
                {summaryLoading ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{formatVND(summary?.today_revenue || 0)}</p>
                )}
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đơn hôm nay</p>
                {summaryLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{summary?.today_orders || 0}</p>
                )}
              </div>
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Doanh thu</TabsTrigger>
          <TabsTrigger value="orders">Đơn hàng</TabsTrigger>
          <TabsTrigger value="products">Sản phẩm bán chạy</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Doanh thu theo ngày ({periodLabel[days] || `${days} ngày`})</CardTitle>
            </CardHeader>
            <CardContent>
              {chartLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesChart || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d: string) => {
                        const date = new Date(d);
                        return `${date.getDate()}/${date.getMonth() + 1}`;
                      }}
                      className="text-muted-foreground"
                      fontSize={12}
                    />
                    <YAxis
                      tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}M`}
                      className="text-muted-foreground"
                      fontSize={12}
                    />
                    <Tooltip
                      formatter={(value: number | undefined) => [formatVND(value ?? 0), "Doanh thu"]}
                      labelFormatter={(d) => {
                        const date = new Date(String(d));
                        return `Ngày ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                      }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Số đơn hàng theo ngày</CardTitle>
            </CardHeader>
            <CardContent>
              {chartLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesChart || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d: string) => {
                        const date = new Date(d);
                        return `${date.getDate()}/${date.getMonth() + 1}`;
                      }}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip
                      formatter={(value: number | undefined) => [value ?? 0, "Đơn hàng"]}
                      labelFormatter={(d) => {
                        const date = new Date(String(d));
                        return `Ngày ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="orders"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sản phẩm bán chạy</CardTitle>
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !topProducts?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Chưa có dữ liệu sản phẩm
                </p>
              ) : (
                <div className="space-y-4">
                  {topProducts.map((p, i) => (
                    <div key={p.product_id} className="flex items-center gap-4">
                      <span className="text-sm font-bold w-6 text-muted-foreground">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.product_name}</p>
                        <p className="text-xs text-muted-foreground">{p.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{p.quantity} SP</p>
                        <p className="text-xs text-muted-foreground">{formatVND(p.revenue)}</p>
                      </div>
                      <div className="w-24">
                        <div className="bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (p.revenue / (topProducts[0]?.revenue || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
