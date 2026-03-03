"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Search, Eye, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { orderService } from "@/services/order-service";
import { formatVND, formatDateTime } from "@/lib/utils";
import type { OrderResponse } from "@/types/api";

const statusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  completed: { label: "Hoàn thành", variant: "default" },
  pending: { label: "Chờ xử lý", variant: "secondary" },
  cancelled: { label: "Đã hủy", variant: "destructive" },
  refunded: { label: "Hoàn tiền", variant: "outline" },
};

const paymentMap: Record<string, string> = {
  cash: "Tiền mặt",
  card: "Thẻ",
  transfer: "Chuyển khoản",
  momo: "MoMo",
  zalopay: "ZaloPay",
  vnpay: "VNPay",
};

export default function OrdersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", page, search, status],
    queryFn: () =>
      orderService.list({
        page,
        limit: 20,
        search: search || undefined,
        status: status !== "all" ? status : undefined,
      } as Record<string, string | number | boolean>),
  });

  const columns: Column<OrderResponse>[] = [
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
      key: "customer",
      header: "Khách hàng",
      render: (o) => o.customer?.full_name || "Khách lẻ",
    },
    {
      key: "items_count",
      header: "SP",
      className: "text-center",
      render: (o) => o.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0,
    },
    {
      key: "total_amount",
      header: "Tổng tiền",
      className: "text-right",
      render: (o) => (
        <span className="font-medium">{formatVND(o.total_amount)}</span>
      ),
    },
    {
      key: "payment",
      header: "Thanh toán",
      render: (o) =>
        o.payments?.[0]
          ? paymentMap[o.payments[0].method] || o.payments[0].method
          : "—",
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (o) => (
        <Badge variant={statusMap[o.status]?.variant || "secondary"}>
          {statusMap[o.status]?.label || o.status}
        </Badge>
      ),
    },
    {
      key: "created_at",
      header: "Ngày tạo",
      className: "text-right",
      render: (o) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(o.created_at)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Đơn hàng" description="Quản lý đơn hàng bán ra" />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo mã đơn, khách hàng..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="completed">Hoàn thành</SelectItem>
                <SelectItem value="pending">Chờ xử lý</SelectItem>
                <SelectItem value="cancelled">Đã hủy</SelectItem>
                <SelectItem value="refunded">Hoàn tiền</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        page={page}
        limit={20}
        total={data?.pagination?.total || 0}
        onPageChange={setPage}
        keyExtractor={(o) => o.id}
        emptyMessage="Chưa có đơn hàng nào"
      />
    </div>
  );
}
