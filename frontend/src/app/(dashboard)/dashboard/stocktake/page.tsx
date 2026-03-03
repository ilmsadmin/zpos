"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { stocktakeService } from "@/services/stocktake-service";
import { formatDateTime } from "@/lib/utils";
import type { StocktakeResponse } from "@/types/api";

const statusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  completed: { label: "Hoàn thành", variant: "default" },
  in_progress: { label: "Đang kiểm", variant: "secondary" },
  pending: { label: "Chờ duyệt", variant: "outline" },
};

export default function StocktakePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [completeId, setCompleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["stocktakes", page],
    queryFn: () => stocktakeService.list({ page, limit: 20 }),
  });

  const createMutation = useMutation({
    mutationFn: () => stocktakeService.create({ notes: notes || undefined }),
    onSuccess: () => {
      toast.success("Đã tạo phiên kiểm kê");
      queryClient.invalidateQueries({ queryKey: ["stocktakes"] });
      setCreateOpen(false);
      setNotes("");
    },
    onError: () => toast.error("Tạo phiên kiểm kê thất bại"),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => stocktakeService.complete(id),
    onSuccess: () => {
      toast.success("Đã hoàn thành kiểm kê");
      queryClient.invalidateQueries({ queryKey: ["stocktakes"] });
      setCompleteId(null);
    },
    onError: () => toast.error("Hoàn thành kiểm kê thất bại"),
  });

  const stocktakes = data?.data || [];
  const total = data?.pagination?.total || 0;

  const inProgressCount = stocktakes.filter((s) => s.status === "in_progress").length;
  const totalDiff = stocktakes.reduce(
    (sum, s) =>
      sum + (s.items?.reduce((d, item) => d + Math.abs(item.difference), 0) || 0),
    0
  );

  const columns: Column<StocktakeResponse>[] = [
    {
      key: "code",
      header: "Mã phiên",
      render: (s) => (
        <button
          className="font-mono font-medium text-primary hover:underline"
          onClick={() => router.push(`/dashboard/stocktake/${s.id}`)}
        >
          {s.stocktake_number}
        </button>
      ),
    },
    {
      key: "date",
      header: "Ngày tạo",
      render: (s) => formatDateTime(s.created_at),
    },
    {
      key: "items",
      header: "Tổng SP",
      className: "text-right",
      render: (s) => s.items?.length || 0,
    },
    {
      key: "matched",
      header: "Khớp",
      className: "text-right",
      render: (s) => (
        <span className="text-green-600 font-medium">
          {s.items?.filter((i) => i.difference === 0).length || 0}
        </span>
      ),
    },
    {
      key: "diff",
      header: "Chênh lệch",
      className: "text-right",
      render: (s) => {
        const diff = s.items?.filter((i) => i.difference !== 0).length || 0;
        return diff > 0 ? (
          <span className="text-red-600 font-medium">{diff}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (s) => {
        const st = statusMap[s.status] || { label: s.status, variant: "secondary" as const };
        return <Badge variant={st.variant}>{st.label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      className: "w-[100px]",
      render: (s) =>
        s.status === "in_progress" ? (
          <Button size="sm" variant="outline" onClick={() => setCompleteId(s.id)}>
            Hoàn thành
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Kiểm kê" description="Quản lý phiên kiểm kê kho hàng">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Tạo phiên kiểm kê
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Tạo phiên kiểm kê mới</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Ghi chú (tùy chọn)</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Mô tả phiên kiểm kê..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Đang tạo..." : "Tạo phiên"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Tổng phiên</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Đang kiểm</p>
              <p className="text-2xl font-bold">{inProgressCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Tổng chênh lệch</p>
              <p className="text-2xl font-bold">{totalDiff}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={stocktakes}
        isLoading={isLoading}
        page={page}
        limit={20}
        total={total}
        onPageChange={setPage}
        keyExtractor={(s) => s.id}
        emptyMessage="Chưa có phiên kiểm kê nào"
      />

      <ConfirmDialog
        open={!!completeId}
        onOpenChange={() => setCompleteId(null)}
        title="Hoàn thành kiểm kê"
        description="Xác nhận hoàn thành phiên kiểm kê? Tồn kho sẽ được cập nhật theo kết quả kiểm đếm."
        confirmLabel="Hoàn thành"
        onConfirm={() => completeId && completeMutation.mutate(completeId)}
        isLoading={completeMutation.isPending}
      />
    </div>
  );
}
