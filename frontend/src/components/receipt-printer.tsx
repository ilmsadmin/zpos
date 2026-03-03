"use client";

import { useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { storeService } from "@/services/store-service";
import { useAuthStore } from "@/stores/auth-store";
import { formatVND } from "@/lib/utils";
import type { OrderResponse } from "@/types/api";

const paymentMethodLabels: Record<string, string> = {
  cash: "Tiền mặt",
  card: "Thẻ",
  transfer: "Chuyển khoản",
  momo: "MoMo",
  zalopay: "ZaloPay",
  vnpay: "VNPay",
};

interface ReceiptPrinterProps {
  order: OrderResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptPrinter({
  order,
  open,
  onOpenChange,
}: ReceiptPrinterProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);

  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: storeService.getAll,
    enabled: open,
  });

  const store = stores?.[0];

  const handlePrint = useCallback(() => {
    if (!receiptRef.current) return;

    const printWindow = window.open("", "_blank", "width=320,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Hóa đơn ${order?.order_number || ""}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 80mm;
            padding: 4mm;
            color: #000;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
          .store-name { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
          .store-info { font-size: 11px; color: #333; }
          .divider {
            border: none;
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .item-name { flex: 1; }
          .item-qty { width: 50px; text-align: center; }
          .item-price { width: 80px; text-align: right; }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
          }
          .total-row.grand {
            font-size: 14px;
            font-weight: bold;
            margin: 4px 0;
          }
          .footer { margin-top: 8px; font-size: 11px; text-align: center; color: #333; }
          @media print {
            body { width: 80mm; }
            @page { size: 80mm auto; margin: 0; }
          }
        </style>
      </head>
      <body>
        ${receiptRef.current.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }, [order]);

  if (!order) return null;

  const orderDate = new Date(order.created_at);
  const dateStr = orderDate.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = orderDate.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Hóa đơn bán hàng
          </DialogTitle>
        </DialogHeader>

        {/* Receipt preview */}
        <div
          ref={receiptRef}
          className="bg-white text-black p-4 rounded-lg border font-mono text-xs leading-relaxed"
        >
          {/* Store header */}
          <div className="center">
            <div className="store-name">{store?.name || "Zplus POS"}</div>
            {store?.address && (
              <div className="store-info">{store.address}</div>
            )}
            {store?.phone && (
              <div className="store-info">ĐT: {store.phone}</div>
            )}
            {store?.email && (
              <div className="store-info">{store.email}</div>
            )}
          </div>

          <hr className="divider" />

          {/* Order info */}
          <div className="center bold" style={{ fontSize: "13px", margin: "4px 0" }}>
            HÓA ĐƠN BÁN HÀNG
          </div>

          <div className="item-row">
            <span>Số HD:</span>
            <span className="bold">{order.order_number}</span>
          </div>
          <div className="item-row">
            <span>Ngày:</span>
            <span>{dateStr} {timeStr}</span>
          </div>
          <div className="item-row">
            <span>Thu ngân:</span>
            <span>{user?.full_name || "—"}</span>
          </div>
          {order.customer && (
            <div className="item-row">
              <span>Khách hàng:</span>
              <span>{order.customer.full_name}</span>
            </div>
          )}

          <hr className="divider" />

          {/* Column headers */}
          <div className="item-row bold" style={{ fontSize: "11px" }}>
            <span className="item-name">Sản phẩm</span>
            <span className="item-qty">SL</span>
            <span className="item-price">Thành tiền</span>
          </div>

          <hr className="divider" />

          {/* Items */}
          {order.items.map((item, idx) => (
            <div key={item.id || idx} style={{ marginBottom: "4px" }}>
              <div style={{ fontWeight: "bold" }}>{item.product_name}</div>
              {item.variant_name &&
                item.variant_name !== "Default" &&
                item.variant_name !== item.product_name && (
                  <div style={{ fontSize: "10px", color: "#555" }}>
                    {item.variant_name}
                  </div>
                )}
              <div className="item-row">
                <span className="item-name">
                  {formatVND(item.unit_price)} × {item.quantity}
                </span>
                <span className="item-price">
                  {item.discount_amount > 0
                    ? formatVND(item.total_price)
                    : formatVND(item.unit_price * item.quantity)}
                </span>
              </div>
              {item.discount_amount > 0 && (
                <div
                  className="item-row"
                  style={{ fontSize: "10px", color: "#555" }}
                >
                  <span>Giảm giá</span>
                  <span>-{formatVND(item.discount_amount)}</span>
                </div>
              )}
            </div>
          ))}

          <hr className="divider" />

          {/* Totals */}
          <div className="total-row">
            <span>Số lượng SP:</span>
            <span>{totalQty}</span>
          </div>
          <div className="total-row">
            <span>Tạm tính:</span>
            <span>{formatVND(order.sub_total)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="total-row">
              <span>
                Giảm giá
                {order.discount_type === "percentage"
                  ? ` (${order.discount_value}%)`
                  : ""}
                :
              </span>
              <span>-{formatVND(order.discount_amount)}</span>
            </div>
          )}
          {order.tax_amount > 0 && (
            <div className="total-row">
              <span>Thuế:</span>
              <span>{formatVND(order.tax_amount)}</span>
            </div>
          )}

          <hr className="divider" />

          <div className="total-row grand">
            <span>TỔNG CỘNG:</span>
            <span>{formatVND(order.total_amount)}</span>
          </div>

          <hr className="divider" />

          {/* Payments */}
          {order.payments.map((p, idx) => (
            <div className="total-row" key={p.id || idx}>
              <span>{paymentMethodLabels[p.method] || p.method}:</span>
              <span>{formatVND(p.amount)}</span>
            </div>
          ))}
          {order.change_amount > 0 && (
            <div className="total-row bold">
              <span>Tiền thừa:</span>
              <span>{formatVND(order.change_amount)}</span>
            </div>
          )}

          <hr className="divider" />

          {/* Footer */}
          <div className="footer">
            <p style={{ fontWeight: "bold", marginBottom: "2px" }}>
              Cảm ơn quý khách!
            </p>
            <p>Hẹn gặp lại</p>
            {order.notes && (
              <p style={{ marginTop: "4px", fontStyle: "italic" }}>
                Ghi chú: {order.notes}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            In hóa đơn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
