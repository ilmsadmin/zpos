"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Eye, Truck } from "lucide-react";
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
import { purchaseOrderService } from "@/services/purchase-order-service";
import { formatVND, formatDate } from "@/lib/utils";
import type { PurchaseOrderResponse } from "@/types/api";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Nháp", variant: "secondary" },
  confirmed: { label: "Đã duyệt", variant: "default" },
  received: { label: "Đã nhận", variant: "default" },
  cancelled: { label: "Đã hủy", variant: "destructive" },
};

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-orders", page, search, status],
    queryFn: () =>
      purchaseOrderService.list({
        page,
        limit: 20,
        status: status !== "all" ? status : undefined,
      } as Record<string, string | number | boolean>),
  });

  const columns: Column<PurchaseOrderResponse>[] = [
    {
      key: "po_number",
      header: "Mã phiếu",
      render: (po) => (
        <button
          className="font-mono font-medium text-sm text-primary hover:underline"
          onClick={() => router.push(`/dashboard/purchase-orders/${po.id}`)}
        >
          {po.po_number || po.order_number || po.id.slice(0, 8)}
        </button>
      ),
    },
    {
      key: "supplier",
      header: "Nhà cung cấp",
      render: (po) => po.supplier?.name || "—",
    },
    {
      key: "items",
      header: "Sản phẩm",
      className: "text-center",
      render: (po) => po.items?.length || 0,
    },
    {
      key: "total",
      header: "Tổng tiền",
      className: "text-right",
      render: (po) => <span className="font-medium">{formatVND(po.total_amount)}</span>,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (po) => {
        const s = statusMap[po.status] || { label: po.status, variant: "secondary" as const };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: "date",
      header: "Ngày tạo",
      render: (po) => <span className="text-muted-foreground text-sm">{formatDate(po.created_at)}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      render: (po) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.push(`/dashboard/purchase-orders/${po.id}`)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Phiếu nhập hàng"
        description="Quản lý phiếu đặt hàng và nhập kho"
      >
        <Button onClick={() => router.push("/dashboard/purchase-orders/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo phiếu nhập
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm phiếu nhập..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="draft">Nháp</SelectItem>
                <SelectItem value="confirmed">Đã duyệt</SelectItem>
                <SelectItem value="received">Đã nhận</SelectItem>
                <SelectItem value="cancelled">Đã hủy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns}
            data={data?.data || []}
            isLoading={isLoading}
            page={page}
            limit={20}
            total={data?.pagination?.total || 0}
            onPageChange={setPage}
            keyExtractor={(po) => po.id}
            emptyMessage="Chưa có phiếu nhập hàng nào"
          />
        </CardContent>
      </Card>
    </div>
  );
}
