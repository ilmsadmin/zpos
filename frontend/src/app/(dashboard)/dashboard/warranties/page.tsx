"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Shield,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileSearch,
} from "lucide-react";
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
import { warrantyService } from "@/services/warranty-service";
import { formatDate } from "@/lib/utils";
import type { WarrantyResponse } from "@/types/api";

const warrantyStatusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  active: { label: "Còn bảo hành", variant: "default" },
  expiring: { label: "Sắp hết hạn", variant: "secondary" },
  expired: { label: "Hết hạn", variant: "destructive" },
  voided: { label: "Đã hủy", variant: "outline" },
};

const claimStatusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Chờ xử lý", variant: "secondary" },
  received: { label: "Đã nhận", variant: "outline" },
  processing: { label: "Đang xử lý", variant: "outline" },
  completed: { label: "Hoàn thành", variant: "default" },
  rejected: { label: "Từ chối", variant: "destructive" },
  returned: { label: "Đã trả", variant: "default" },
};

export default function WarrantiesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const { data: warrantiesData, isLoading: warrantiesLoading } = useQuery({
    queryKey: ["warranties", page, search, status],
    queryFn: () =>
      warrantyService.list({
        page,
        limit: 20,
        search: search || undefined,
        status: status !== "all" ? status : undefined,
      } as Record<string, string | number | boolean>),
  });

  const { data: expiringData } = useQuery({
    queryKey: ["warranties-expiring"],
    queryFn: () => warrantyService.getExpiring({ days: 30, limit: 1 }),
  });

  const { data: activeClaimsCount = 0 } = useQuery({
    queryKey: ["warranties-active-claims-count"],
    queryFn: () => warrantyService.getActiveClaimsCount(),
  });

  const warranties = warrantiesData?.data || [];
  const totalWarranties = warrantiesData?.pagination?.total || 0;
  const expiringCount = expiringData?.pagination?.total || 0;

  const warrantyColumns: Column<WarrantyResponse>[] = [
    {
      key: "code",
      header: "Mã bảo hành",
      render: (w) => (
        <button
          className="font-mono font-medium text-primary hover:underline"
          onClick={() => router.push(`/dashboard/warranties/${w.id}`)}
        >
          {w.warranty_code}
        </button>
      ),
    },
    {
      key: "product",
      header: "Sản phẩm",
      render: (w) => w.product_variant?.name || "—",
    },
    {
      key: "customer",
      header: "Khách hàng",
      render: (w) => w.customer?.full_name || "—",
    },
    {
      key: "start",
      header: "Ngày bắt đầu",
      render: (w) => <span className="text-muted-foreground">{formatDate(w.start_date)}</span>,
    },
    {
      key: "end",
      header: "Ngày hết hạn",
      render: (w) => <span className="text-muted-foreground">{formatDate(w.end_date)}</span>,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (w) => {
        const s = warrantyStatusMap[w.status] || { label: w.status, variant: "secondary" as const };
        return (
          <Badge variant={s.variant}>
            {s.label}
            {w.days_remaining > 0 && w.status === "active" && ` (${w.days_remaining} ngày)`}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Bảo hành" description="Quản lý bảo hành và yêu cầu bảo hành">
        <Button variant="outline" onClick={() => router.push("/dashboard/warranties/lookup")}>
          <FileSearch className="mr-2 h-4 w-4" /> Tra cứu BH
        </Button>
        <Button onClick={() => router.push("/dashboard/warranties/create")}>
          <Plus className="mr-2 h-4 w-4" /> Tạo phiếu BH
        </Button>
      </PageHeader>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Tổng phiếu</p>
              <p className="text-2xl font-bold">{totalWarranties}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Đang bảo hành</p>
              <p className="text-2xl font-bold">
                {warranties.filter((w) => w.status === "active" || w.status === "expiring").length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Sắp hết hạn</p>
              <p className="text-2xl font-bold">{expiringCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">Yêu cầu BH</p>
              <p className="text-2xl font-bold">
                {activeClaimsCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo mã bảo hành, sản phẩm, khách hàng..."
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
                <SelectItem value="active">Còn bảo hành</SelectItem>
                <SelectItem value="expired">Hết hạn</SelectItem>
                <SelectItem value="voided">Đã hủy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={warrantyColumns}
        data={warranties}
        isLoading={warrantiesLoading}
        page={page}
        limit={20}
        total={totalWarranties}
        onPageChange={setPage}
        keyExtractor={(w) => w.id}
        emptyMessage="Chưa có phiếu bảo hành nào"
      />
    </div>
  );
}
