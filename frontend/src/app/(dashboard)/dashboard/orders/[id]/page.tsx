"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Package,
  CreditCard,
  User,
  Clock,
  XCircle,
  RotateCcw,
  Receipt,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { orderService } from "@/services/order-service";
import { ReceiptPrinter } from "@/components/receipt-printer";
import { formatVND, formatDateTime } from "@/lib/utils";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  completed: { label: "Hoàn thành", variant: "default", color: "text-green-600" },
  pending: { label: "Chờ xử lý", variant: "secondary", color: "text-yellow-600" },
  cancelled: { label: "Đã hủy", variant: "destructive", color: "text-red-600" },
  refunded: { label: "Hoàn tiền", variant: "outline", color: "text-gray-600" },
};

const paymentMethodMap: Record<string, string> = {
  cash: "Tiền mặt",
  card: "Thẻ",
  transfer: "Chuyển khoản",
  momo: "MoMo",
  zalopay: "ZaloPay",
  vnpay: "VNPay",
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orderId = params.id as string;

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [reason, setReason] = useState("");

  const { data: order, isLoading } = useQuery({
    queryKey: ["orders", orderId],
    queryFn: () => orderService.getById(orderId),
    enabled: !!orderId,
  });

  const cancelMutation = useMutation({
    mutationFn: () => orderService.cancel(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Đã hủy đơn hàng");
      setCancelDialogOpen(false);
      setReason("");
    },
    onError: () => toast.error("Không thể hủy đơn hàng"),
  });

  const refundMutation = useMutation({
    mutationFn: () => orderService.refund(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Đã hoàn tiền đơn hàng");
      setRefundDialogOpen(false);
      setReason("");
    },
    onError: () => toast.error("Không thể hoàn tiền đơn hàng"),
  });

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

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Không tìm thấy đơn hàng</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Quay lại
        </Button>
      </div>
    );
  }

  const status = statusMap[order.status] || { label: order.status, variant: "secondary" as const, color: "" };

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
              <h1 className="text-2xl font-bold">#{order.order_number}</h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDateTime(order.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setReceiptOpen(true)}>
            <Printer className="mr-2 h-4 w-4" />
            In hóa đơn
          </Button>
          {order.status === "completed" && (
            <Button
              variant="outline"
              onClick={() => setRefundDialogOpen(true)}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Hoàn tiền
            </Button>
          )}
          {order.status === "pending" && (
            <Button
              variant="destructive"
              onClick={() => setCancelDialogOpen(true)}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Hủy đơn
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order Items */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Sản phẩm ({order.items?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-center">SL</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                  <TableHead className="text-right">Giảm giá</TableHead>
                  <TableHead className="text-right">Thành tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.variant_name} • {item.sku}
                        </p>
                        {item.warranty_months > 0 && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            BH {item.warranty_months} tháng
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatVND(item.unit_price)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.discount_amount > 0
                        ? `-${formatVND(item.discount_amount)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatVND(item.total_price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Separator className="my-4" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tạm tính</span>
                <span>{formatVND(order.sub_total)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>
                    Giảm giá{" "}
                    {order.discount_type === "percentage"
                      ? `(${order.discount_value}%)`
                      : ""}
                  </span>
                  <span>-{formatVND(order.discount_amount)}</span>
                </div>
              )}
              {order.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Thuế</span>
                  <span>{formatVND(order.tax_amount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Tổng cộng</span>
                <span className="text-primary">{formatVND(order.total_amount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Khách hàng
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.customer ? (
                <div className="space-y-2 text-sm">
                  <p className="font-medium">{order.customer.full_name}</p>
                  {order.customer.phone && (
                    <p className="text-muted-foreground">{order.customer.phone}</p>
                  )}
                  {order.customer.email && (
                    <p className="text-muted-foreground">{order.customer.email}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Khách lẻ</p>
              )}
            </CardContent>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" />
                Thanh toán
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.payments?.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {paymentMethodMap[payment.method] || payment.method}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.status === "completed" ? "Đã thanh toán" : payment.status}
                    </p>
                  </div>
                  <span className="font-medium">{formatVND(payment.amount)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Đã thanh toán</span>
                <span className="font-medium">{formatVND(order.paid_amount)}</span>
              </div>
              {order.change_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tiền thừa</span>
                  <span className="font-medium">{formatVND(order.change_amount)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ghi chú</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hủy đơn hàng #{order.order_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lý do hủy *</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do hủy đơn..."
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                Quay lại
              </Button>
              <Button
                variant="destructive"
                onClick={() => cancelMutation.mutate()}
                disabled={!reason || cancelMutation.isPending}
              >
                {cancelMutation.isPending ? "Đang xử lý..." : "Xác nhận hủy"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hoàn tiền đơn hàng #{order.order_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Số tiền hoàn</p>
              <p className="text-2xl font-bold">{formatVND(order.total_amount)}</p>
            </div>
            <div className="space-y-2">
              <Label>Lý do hoàn tiền *</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do hoàn tiền..."
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
                Quay lại
              </Button>
              <Button
                onClick={() => refundMutation.mutate()}
                disabled={!reason || refundMutation.isPending}
              >
                {refundMutation.isPending ? "Đang xử lý..." : "Xác nhận hoàn tiền"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt printer */}
      <ReceiptPrinter
        order={order}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />
    </div>
  );
}
