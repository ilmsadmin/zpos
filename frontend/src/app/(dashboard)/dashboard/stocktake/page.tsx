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
  XCircle,
  FileText,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { stocktakeService } from "@/services/stocktake-service";
import { formatDateTime } from "@/lib/utils";
import type { StocktakeResponse } from "@/types/api";

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ReactNode }
> = {
  draft: { label: "Nháp", variant: "outline", icon: <FileText className="h-3 w-3" /> },
  in_progress: { label: "Đang kiểm", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  completed: { label: "Hoàn thành", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: "Đã hủy", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
};

export default function StocktakePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const queryParams: Record<string, string | number | boolean> = {
    page,
    limit: 20,
  };
  if (statusFilter && statusFilter !== "all") queryParams.status = statusFilter;
  if (searchQuery) queryParams.search = searchQuery;

  const { data, isLoading } = useQuery({
    queryKey: ["stocktakes", page, statusFilter, searchQuery],
    queryFn: () => stocktakeService.list(queryParams),
  });

  const createMutation = useMutation({
    mutationFn: () => stocktakeService.create({ notes: notes || undefined }),
    onSuccess: (result) => {
      toast.success("Đã tạo phiên kiểm kê");
      queryClient.invalidateQueries({ queryKey: ["stocktakes"] });
      setCreateOpen(false);
      setNotes("");
      router.push(`/dashboard/stocktake/${result.id}`);
    },
    onError: () => toast.error("Tạo phiên kiểm kê thất bại"),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => stocktakeService.complete(id),
    onSuccess: () => {
      toast.success("Đã hoàn thành kiểm kê, tồn kho đã được cập nhật");
      queryClient.invalidateQueries({ queryKey: ["stocktakes"] });
      setCompleteId(null);
    },
    onError: () => toast.error("Hoàn thành kiểm kê thất bại"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => stocktakeService.cancel(id),
    onSuccess: () => {
      toast.success("Đã hủy phiên kiểm kê");
      queryClient.invalidateQueries({ queryKey: ["stocktakes"] });
      setCancelId(null);
    },
    onError: () => toast.error("Hủy phiên kiểm kê thất bại"),
  });

  const stocktakes = data?.data || [];
  const total = data?.pagination?.total || 0;

  const draftCount = stocktakes.filter((s) => s.status === "draft").length;
  const inProgressCount = stocktakes.filter((s) => s.status === "in_progress").length;
  const completedCount = stocktakes.filter((s) => s.status === "completed").length;
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
          {s.stocktake_number || s.code}
        </button>
      ),
    },
    {
      key: "date",
      header: "Ngày tạo",
      render: (s) => formatDateTime(s.created_at),
    },
    {
      key: "notes",
      header: "Ghi chú",
      render: (s) => (
        <span className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">
          {s.notes || "-"}
        </span>
      ),
    },
    {
      key: "items",
      header: "Tổng SP",
      className: "text-right",
      render: (s) => s.items?.length || s.total_items || 0,
    },
    {
      key: "matched",
      header: "Khớp",
      className: "text-right",
      render: (s) => {
        const matched = s.status === "completed"
          ? s.matched_items
          : (s.items?.filter((i) => i.difference === 0).length || 0);
        return <span className="text-green-600 font-medium">{matched}</span>;
      },
    },
    {
      key: "diff",
      header: "Lệch",
      className: "text-right",
      render: (s) => {
        const diff = s.status === "completed"
          ? s.mismatch_items
          : (s.items?.filter((i) => i.difference !== 0).length || 0);
        return diff > 0 ? (
          <span className="text-red-600 font-medium">{diff}</span>
        ) : (
          <span className="text-muted-foreground">0</span>
        );
      },
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (s) => {
        const cfg = statusConfig[s.status] || { label: s.status, variant: "secondary" as const, icon: null };
        return (
          <Badge variant={cfg.variant} className="gap-1">
            {cfg.icon}
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      className: "w-[180px]",
      render: (s) => (
        <div className="flex gap-1">
          {(s.status === "draft" || s.status === "in_progress") && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/dashboard/stocktake/${s.id}`)}
              >
                Kiểm kê
              </Button>
              {s.status === "in_progress" && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setCompleteId(s.id)}
                >
                  Xong
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-700"
                onClick={() => setCancelId(s.id)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
          {(s.status === "completed" || s.status === "cancelled") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/dashboard/stocktake/${s.id}`)}
            >
              Xem
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Kiểm kê kho" description="Quản lý phiên kiểm kê, đối chiếu tồn kho thực tế">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tạo phiên kiểm kê
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
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
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Mô tả phiên kiểm kê, ví dụ: Kiểm kê cuối tháng 3/2026..."
                  rows={3}
                />
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <p>💡 Sau khi tạo, bạn có thể:</p>
                <ul className="list-disc ml-4 mt-1 space-y-1">
                  <li>Quét mã vạch để thêm sản phẩm nhanh</li>
                  <li>Tìm kiếm và thêm từng sản phẩm</li>
                  <li>Cập nhật số lượng thực tế</li>
                  <li>Hoàn thành để tự động cập nhật tồn kho</li>
                </ul>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Đang tạo..." : "Tạo & bắt đầu kiểm kê"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tổng phiên</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Đang kiểm / Nháp</p>
              <p className="text-2xl font-bold">{inProgressCount + draftCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hoàn thành</p>
              <p className="text-2xl font-bold">{completedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tổng chênh lệch</p>
              <p className="text-2xl font-bold text-red-600">{totalDiff}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Tìm theo mã phiên, ghi chú..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="draft">Nháp</SelectItem>
            <SelectItem value="in_progress">Đang kiểm</SelectItem>
            <SelectItem value="completed">Hoàn thành</SelectItem>
            <SelectItem value="cancelled">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
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
        description="Xác nhận hoàn thành phiên kiểm kê? Tồn kho sẽ được tự động cập nhật theo kết quả kiểm đếm. Hành động không thể hoàn tác."
        confirmLabel="Hoàn thành"
        onConfirm={() => completeId && completeMutation.mutate(completeId)}
        isLoading={completeMutation.isPending}
      />

      <ConfirmDialog
        open={!!cancelId}
        onOpenChange={() => setCancelId(null)}
        title="Hủy phiên kiểm kê"
        description="Xác nhận hủy phiên kiểm kê này? Dữ liệu kiểm đếm sẽ không được áp dụng vào tồn kho."
        confirmLabel="Hủy phiên"
        variant="destructive"
        onConfirm={() => cancelId && cancelMutation.mutate(cancelId)}
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
