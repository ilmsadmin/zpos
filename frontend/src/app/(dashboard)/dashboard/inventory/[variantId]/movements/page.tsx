"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { inventoryService, type InventoryMovementResponse } from "@/services/inventory-service";
import { formatDateTime } from "@/lib/utils";

const typeMap: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  in: { label: "Nhập kho", icon: <ArrowDownCircle className="h-4 w-4" />, color: "text-green-600" },
  out: { label: "Xuất kho", icon: <ArrowUpCircle className="h-4 w-4" />, color: "text-red-600" },
  adjustment: { label: "Điều chỉnh", icon: <RefreshCw className="h-4 w-4" />, color: "text-blue-600" },
  sale: { label: "Bán hàng", icon: <ArrowUpCircle className="h-4 w-4" />, color: "text-red-600" },
  purchase: { label: "Nhập hàng", icon: <ArrowDownCircle className="h-4 w-4" />, color: "text-green-600" },
  return: { label: "Trả hàng", icon: <ArrowDownCircle className="h-4 w-4" />, color: "text-orange-600" },
  stocktake: { label: "Kiểm kê", icon: <RefreshCw className="h-4 w-4" />, color: "text-purple-600" },
};

export default function InventoryMovementsPage({
  params,
}: {
  params: Promise<{ variantId: string }>;
}) {
  const { variantId } = use(params);
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ["inventory", variantId],
    queryFn: () => inventoryService.getByVariant(variantId),
  });

  const { data: movementsData, isLoading: movementsLoading } = useQuery({
    queryKey: ["inventory-movements", variantId, page],
    queryFn: () => inventoryService.getMovements(variantId, { page, limit: 20 }),
  });

  const movements = movementsData?.data || [];
  const total = movementsData?.pagination?.total || 0;
  const totalPages = movementsData?.pagination?.total_pages || 1;

  if (inventoryLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lịch sử kho"
        description="Lịch sử xuất nhập kho của sản phẩm"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>
      </PageHeader>

      {/* Current stock info */}
      {inventory && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Tồn kho hiện tại</p>
              <p className="text-2xl font-bold">{inventory.quantity}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Đã đặt trước</p>
              <p className="text-2xl font-bold">{inventory.reserved_qty}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Có thể bán</p>
              <p className="text-2xl font-bold">{inventory.available_qty}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Mức tối thiểu</p>
              <p className="text-2xl font-bold">{inventory.min_stock_level}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Movements timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử ({total} bản ghi)</CardTitle>
        </CardHeader>
        <CardContent>
          {movementsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : movements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Chưa có lịch sử xuất nhập kho
            </p>
          ) : (
            <div className="space-y-3">
              {movements.map((m: InventoryMovementResponse) => {
                const t = typeMap[m.type] || {
                  label: m.type,
                  icon: <RefreshCw className="h-4 w-4" />,
                  color: "text-muted-foreground",
                };
                return (
                  <div
                    key={m.id}
                    className="flex items-start gap-4 border rounded-lg p-4"
                  >
                    <div className={`mt-0.5 ${t.color}`}>{t.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.label}</span>
                        <Badge
                          variant={m.quantity > 0 ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {m.quantity > 0 ? "+" : ""}
                          {m.quantity}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {m.previous_qty} → {m.new_qty}
                      </div>
                      {m.notes && (
                        <p className="text-sm mt-1">{m.notes}</p>
                      )}
                      {m.reference_type && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Tham chiếu: {m.reference_type}
                          {m.reference_id ? ` #${m.reference_id}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(m.created_at)}
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Trang {page} / {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p - 1)}
                      disabled={page <= 1}
                    >
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= totalPages}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
