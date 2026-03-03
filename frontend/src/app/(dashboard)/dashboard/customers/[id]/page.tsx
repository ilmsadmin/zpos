"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  User,
  ShoppingCart,
  Shield,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/data-table";
import { customerService } from "@/services/customer-service";
import { formatVND, formatDate, formatDateTime } from "@/lib/utils";
import type { OrderResponse, WarrantyResponse } from "@/types/api";

const orderStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  completed: { label: "Hoàn thành", variant: "default" },
  pending: { label: "Chờ xử lý", variant: "secondary" },
  cancelled: { label: "Đã hủy", variant: "destructive" },
  refunded: { label: "Hoàn tiền", variant: "outline" },
};

const warrantyStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Còn BH", variant: "default" },
  expired: { label: "Hết hạn", variant: "destructive" },
  voided: { label: "Đã hủy", variant: "outline" },
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const [ordersPage, setOrdersPage] = useState(1);
  const [warrantiesPage, setWarrantiesPage] = useState(1);

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customers", customerId],
    queryFn: () => customerService.getById(customerId),
    enabled: !!customerId,
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["customers", customerId, "orders", ordersPage],
    queryFn: () => customerService.getOrders(customerId, { page: ordersPage, limit: 10 }),
    enabled: !!customerId,
  });

  const { data: warrantiesData, isLoading: warrantiesLoading } = useQuery({
    queryKey: ["customers", customerId, "warranties", warrantiesPage],
    queryFn: () => customerService.getWarranties(customerId, { page: warrantiesPage, limit: 10 }),
    enabled: !!customerId,
  });

  const orderColumns: Column<OrderResponse>[] = [
    {
      key: "order_number",
      header: "Mã đơn",
      render: (o) => (
        <button
          className="font-mono font-medium text-sm text-primary hover:underline"
          onClick={() => router.push(`/dashboard/orders/${o.id}`)}
        >
          {o.order_number}
        </button>
      ),
    },
    {
      key: "items",
      header: "Sản phẩm",
      render: (o) => `${o.items?.length || 0} sản phẩm`,
    },
    {
      key: "total",
      header: "Tổng tiền",
      className: "text-right",
      render: (o) => <span className="font-medium">{formatVND(o.total_amount)}</span>,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (o) => {
        const s = orderStatusMap[o.status] || { label: o.status, variant: "secondary" as const };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: "date",
      header: "Ngày tạo",
      render: (o) => <span className="text-muted-foreground text-sm">{formatDateTime(o.created_at)}</span>,
    },
  ];

  const warrantyColumns: Column<WarrantyResponse>[] = [
    {
      key: "code",
      header: "Mã bảo hành",
      render: (w) => <span className="font-mono font-medium">{w.warranty_code}</span>,
    },
    {
      key: "product",
      header: "Sản phẩm",
      render: (w) => w.product_variant?.name || "—",
    },
    {
      key: "end_date",
      header: "Hết hạn",
      render: (w) => formatDate(w.end_date),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (w) => {
        const s = warrantyStatusMap[w.status] || { label: w.status, variant: "secondary" as const };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: "remaining",
      header: "Còn lại",
      render: (w) =>
        w.days_remaining > 0
          ? `${w.days_remaining} ngày`
          : "Hết hạn",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Không tìm thấy khách hàng</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{customer.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            Khách hàng từ {formatDate(customer.created_at)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Customer Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Thông tin khách hàng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-lg font-bold">
                  {customer.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold">{customer.full_name}</p>
                  <Badge variant={customer.is_active ? "default" : "secondary"}>
                    {customer.is_active ? "Hoạt động" : "Ngừng"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.email}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.address}</span>
                  </div>
                )}
                {customer.date_of_birth && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(customer.date_of_birth)}</span>
                  </div>
                )}
              </div>

              {customer.tags && customer.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {customer.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thống kê</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Tổng chi tiêu</span>
                </div>
                <span className="font-bold text-primary">{formatVND(customer.total_spent)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Số đơn hàng</span>
                </div>
                <span className="font-bold">{customer.order_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Điểm tích lũy</span>
                </div>
                <span className="font-bold">{customer.points}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders & Warranties */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <Tabs defaultValue="orders">
              <TabsList>
                <TabsTrigger value="orders">
                  Đơn hàng ({ordersData?.pagination?.total || 0})
                </TabsTrigger>
                <TabsTrigger value="warranties">
                  Bảo hành ({warrantiesData?.pagination?.total || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="mt-4">
                <DataTable
                  columns={orderColumns}
                  data={ordersData?.data || []}
                  isLoading={ordersLoading}
                  page={ordersPage}
                  limit={10}
                  total={ordersData?.pagination?.total || 0}
                  onPageChange={setOrdersPage}
                  keyExtractor={(o) => o.id}
                  emptyMessage="Khách hàng chưa có đơn hàng nào"
                />
              </TabsContent>

              <TabsContent value="warranties" className="mt-4">
                <DataTable
                  columns={warrantyColumns}
                  data={warrantiesData?.data || []}
                  isLoading={warrantiesLoading}
                  page={warrantiesPage}
                  limit={10}
                  total={warrantiesData?.pagination?.total || 0}
                  onPageChange={setWarrantiesPage}
                  keyExtractor={(w) => w.id}
                  emptyMessage="Khách hàng chưa có phiếu bảo hành nào"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
