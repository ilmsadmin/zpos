"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { stocktakeService } from "@/services/stocktake-service";
import { productService } from "@/services/product-service";
import { formatDateTime } from "@/lib/utils";
import type { StocktakeItemResponse, ProductResponse } from "@/types/api";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  completed: { label: "Hoàn thành", variant: "default" },
  in_progress: { label: "Đang kiểm", variant: "secondary" },
  pending: { label: "Chờ duyệt", variant: "outline" },
};

export default function StocktakeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [completeOpen, setCompleteOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [countedQty, setCountedQty] = useState(0);

  const { data: stocktake, isLoading } = useQuery({
    queryKey: ["stocktake", id],
    queryFn: () => stocktakeService.getById(id),
  });

  const { data: searchResults } = useQuery({
    queryKey: ["product-search-stocktake", productSearch],
    queryFn: () => productService.search(productSearch, 10),
    enabled: productSearch.length >= 2,
  });

  const addItemMutation = useMutation({
    mutationFn: () =>
      stocktakeService.addItem(id, {
        product_variant_id: selectedVariantId,
        counted_qty: countedQty,
      }),
    onSuccess: () => {
      toast.success("Đã thêm sản phẩm kiểm kê");
      queryClient.invalidateQueries({ queryKey: ["stocktake", id] });
      setAddItemOpen(false);
      setProductSearch("");
      setSelectedVariantId("");
      setCountedQty(0);
    },
    onError: () => toast.error("Thêm sản phẩm thất bại"),
  });

  const completeMutation = useMutation({
    mutationFn: () => stocktakeService.complete(id),
    onSuccess: () => {
      toast.success("Đã hoàn thành kiểm kê, tồn kho đã được cập nhật");
      queryClient.invalidateQueries({ queryKey: ["stocktake", id] });
      queryClient.invalidateQueries({ queryKey: ["stocktakes"] });
      setCompleteOpen(false);
    },
    onError: () => toast.error("Hoàn thành kiểm kê thất bại"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-60" />
      </div>
    );
  }

  if (!stocktake) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Không tìm thấy phiên kiểm kê</p>
        <Button variant="link" onClick={() => router.back()}>
          Quay lại
        </Button>
      </div>
    );
  }

  const st = statusMap[stocktake.status] || { label: stocktake.status, variant: "secondary" as const };
  const items = stocktake.items || [];
  const matchedCount = items.filter((i) => i.difference === 0).length;
  const discrepancyCount = items.filter((i) => i.difference !== 0).length;
  const totalDifference = items.reduce((sum, i) => sum + Math.abs(i.difference), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Kiểm kê: ${stocktake.stocktake_number}`}
        description={`Tạo lúc: ${formatDateTime(stocktake.created_at)}`}
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>
        {stocktake.status === "in_progress" && (
          <>
            <Button variant="outline" onClick={() => setAddItemOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Thêm sản phẩm
            </Button>
            <Button onClick={() => setCompleteOpen(true)}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Hoàn thành
            </Button>
          </>
        )}
      </PageHeader>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Trạng thái</p>
            <Badge variant={st.variant} className="mt-1">{st.label}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tổng SP kiểm</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Khớp</p>
            <p className="text-2xl font-bold text-green-600">{matchedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Chênh lệch</p>
            <p className="text-2xl font-bold text-red-600">{discrepancyCount}</p>
          </CardContent>
        </Card>
      </div>

      {stocktake.notes && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Ghi chú</p>
            <p className="mt-1">{stocktake.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Items table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" /> Chi tiết kiểm kê
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Chưa có sản phẩm nào. Thêm sản phẩm để bắt đầu kiểm kê.
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 font-medium">Sản phẩm</th>
                    <th className="text-left p-3 font-medium">SKU</th>
                    <th className="text-right p-3 font-medium">Hệ thống</th>
                    <th className="text-right p-3 font-medium">Thực tế</th>
                    <th className="text-right p-3 font-medium">Chênh lệch</th>
                    <th className="text-center p-3 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-3">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                      </td>
                      <td className="p-3 font-mono text-xs">{item.sku}</td>
                      <td className="p-3 text-right">{item.system_qty}</td>
                      <td className="p-3 text-right font-medium">{item.counted_qty}</td>
                      <td className="p-3 text-right">
                        <span
                          className={
                            item.difference === 0
                              ? "text-green-600"
                              : item.difference > 0
                              ? "text-blue-600"
                              : "text-red-600"
                          }
                        >
                          {item.difference > 0 ? "+" : ""}
                          {item.difference}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {item.difference === 0 ? (
                          <Badge variant="default" className="text-xs">Khớp</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <AlertTriangle className="h-3 w-3" /> Lệch
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {discrepancyCount > 0 && (
                  <tfoot>
                    <tr className="border-t bg-muted/30">
                      <td colSpan={4} className="p-3 text-right font-medium">
                        Tổng chênh lệch tuyệt đối:
                      </td>
                      <td className="p-3 text-right font-bold text-red-600">
                        {totalDifference}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add item dialog */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm sản phẩm kiểm kê</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tìm sản phẩm</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Nhập tên hoặc SKU..."
                  className="pl-9"
                />
              </div>
              {searchResults && searchResults.length > 0 && (
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {searchResults.flatMap((p: ProductResponse) =>
                    (p.variants || []).map((v) => (
                      <button
                        key={v.id}
                        className={`w-full text-left p-3 text-sm hover:bg-muted/50 border-b last:border-b-0 ${
                          selectedVariantId === v.id ? "bg-primary/10" : ""
                        }`}
                        onClick={() => setSelectedVariantId(v.id)}
                      >
                        <p className="font-medium">
                          {p.name} - {v.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          SKU: {v.sku} | Tồn: {v.inventory?.quantity ?? 0}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Số lượng thực tế</Label>
              <Input
                type="number"
                value={countedQty || ""}
                onChange={(e) => setCountedQty(Number(e.target.value))}
                min={0}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddItemOpen(false)}>
                Hủy
              </Button>
              <Button
                onClick={() => addItemMutation.mutate()}
                disabled={!selectedVariantId || addItemMutation.isPending}
              >
                {addItemMutation.isPending ? "Đang thêm..." : "Thêm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete confirmation */}
      <ConfirmDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title="Hoàn thành kiểm kê"
        description={`Xác nhận hoàn thành phiên kiểm kê ${stocktake.stocktake_number}? Tồn kho sẽ được tự động cập nhật theo kết quả kiểm đếm. Hành động không thể hoàn tác.`}
        confirmLabel="Hoàn thành"
        onConfirm={() => completeMutation.mutate()}
        isLoading={completeMutation.isPending}
      />
    </div>
  );
}
