"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { purchaseOrderService } from "@/services/purchase-order-service";
import { formatVND, formatDate, formatDateTime } from "@/lib/utils";
import type { PurchaseOrderItemResponse } from "@/types/api";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; step: number }> = {
  draft: { label: "Nháp", variant: "secondary", step: 0 },
  confirmed: { label: "Đã duyệt", variant: "default", step: 1 },
  received: { label: "Đã nhận đủ", variant: "default", step: 2 },
  cancelled: { label: "Đã hủy", variant: "destructive", step: -1 },
};

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const poId = params.id as string;

  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [receiveItems, setReceiveItems] = useState<Record<string, number>>({});

  const { data: po, isLoading } = useQuery({
    queryKey: ["purchase-orders", poId],
    queryFn: () => purchaseOrderService.getById(poId),
    enabled: !!poId,
  });

  const approveMutation = useMutation({
    mutationFn: () => purchaseOrderService.approve(poId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Đã duyệt phiếu nhập hàng");
    },
    onError: () => toast.error("Không thể duyệt phiếu"),
  });

  const receiveMutation = useMutation({
    mutationFn: () =>
      purchaseOrderService.receive(poId, {
        items: Object.entries(receiveItems).map(([id, qty]) => ({
          purchase_order_item_id: id,
          received_qty: qty,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Đã cập nhật nhận hàng");
      setReceiveDialogOpen(false);
    },
    onError: () => toast.error("Không thể cập nhật nhận hàng"),
  });

  const openReceiveDialog = () => {
    const initial: Record<string, number> = {};
    po?.items?.forEach((item) => {
      initial[item.id] = item.quantity - item.received_qty;
    });
    setReceiveItems(initial);
    setReceiveDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Không tìm thấy phiếu nhập hàng</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Quay lại
        </Button>
      </div>
    );
  }

  const status = statusMap[po.status] || { label: po.status, variant: "secondary" as const, step: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                Phiếu nhập #{po.po_number || po.order_number || po.id.slice(0, 8)}
              </h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Tạo ngày {formatDateTime(po.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {po.status === "draft" && (
            <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {approveMutation.isPending ? "Đang duyệt..." : "Duyệt phiếu"}
            </Button>
          )}
          {po.status === "confirmed" && (
            <Button onClick={openReceiveDialog}>
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Nhận hàng
            </Button>
          )}
        </div>
      </div>

      {/* Status Steps */}
      {status.step >= 0 && (
        <div className="flex items-center gap-2">
          {["Nháp", "Đã duyệt", "Đã nhận"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  i <= status.step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-sm ${i <= status.step ? "font-medium" : "text-muted-foreground"}`}>
                {label}
              </span>
              {i < 2 && <div className={`w-8 h-0.5 ${i < status.step ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Danh sách sản phẩm ({po.items?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-center">Đặt</TableHead>
                  <TableHead className="text-center">Đã nhận</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                  <TableHead className="text-right">Thành tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.product_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.variant_name || ""} {item.sku ? `• ${item.sku}` : ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className={
                          item.received_qty >= item.quantity
                            ? "text-green-600 font-medium"
                            : item.received_qty > 0
                            ? "text-yellow-600 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {item.received_qty}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatVND(item.unit_cost || 0)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatVND(item.total_cost || item.quantity * (item.unit_cost || 0))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Separator className="my-4" />

            <div className="flex justify-end">
              <div className="space-y-2 text-sm w-64">
                <div className="flex justify-between text-lg font-bold">
                  <span>Tổng cộng</span>
                  <span className="text-primary">{formatVND(po.total_amount)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="h-4 w-4" />
                Nhà cung cấp
              </CardTitle>
            </CardHeader>
            <CardContent>
              {po.supplier ? (
                <div className="space-y-2 text-sm">
                  <p className="font-medium">{po.supplier.name}</p>
                  {po.supplier.phone && (
                    <p className="text-muted-foreground">{po.supplier.phone}</p>
                  )}
                  {po.supplier.email && (
                    <p className="text-muted-foreground">{po.supplier.email}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>

          {po.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ghi chú</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{po.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Receive Dialog */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nhận hàng</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Nhập số lượng thực tế nhận được cho từng sản phẩm
            </p>
            <div className="space-y-3">
              {po.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.product_name || "Sản phẩm"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Đặt: {item.quantity} | Đã nhận: {item.received_qty}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={item.quantity - item.received_qty}
                    value={receiveItems[item.id] || 0}
                    onChange={(e) =>
                      setReceiveItems({
                        ...receiveItems,
                        [item.id]: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-20"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReceiveDialogOpen(false)}>
                Hủy
              </Button>
              <Button
                onClick={() => receiveMutation.mutate()}
                disabled={receiveMutation.isPending}
              >
                {receiveMutation.isPending ? "Đang xử lý..." : "Xác nhận nhận hàng"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
