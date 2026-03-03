"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  DollarSign,
  ShoppingBag,
  Play,
  Square,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { posSessionService, type OpenPOSSessionRequest, type ClosePOSSessionRequest } from "@/services/pos-session-service";
import { formatVND, formatDateTime } from "@/lib/utils";
import type { POSSessionResponse } from "@/types/api";

export default function POSSessionsPage() {
  const queryClient = useQueryClient();
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [openingAmount, setOpeningAmount] = useState(0);
  const [closingAmount, setClosingAmount] = useState(0);
  const [notes, setNotes] = useState("");

  const { data: currentSession } = useQuery({
    queryKey: ["pos-session-current"],
    queryFn: () => posSessionService.getCurrent(),
  });

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["pos-sessions"],
    queryFn: () => posSessionService.list({ limit: 50 }),
  });

  const openMutation = useMutation({
    mutationFn: (data: OpenPOSSessionRequest) => posSessionService.open(data),
    onSuccess: () => {
      toast.success("Đã mở ca bán hàng");
      queryClient.invalidateQueries({ queryKey: ["pos-session-current"] });
      queryClient.invalidateQueries({ queryKey: ["pos-sessions"] });
      setOpenDialogOpen(false);
      setOpeningAmount(0);
      setNotes("");
    },
    onError: () => toast.error("Mở ca thất bại"),
  });

  const closeMutation = useMutation({
    mutationFn: (data: ClosePOSSessionRequest) =>
      posSessionService.close(currentSession!.id, data),
    onSuccess: () => {
      toast.success("Đã đóng ca bán hàng");
      queryClient.invalidateQueries({ queryKey: ["pos-session-current"] });
      queryClient.invalidateQueries({ queryKey: ["pos-sessions"] });
      setCloseDialogOpen(false);
      setClosingAmount(0);
      setNotes("");
    },
    onError: () => toast.error("Đóng ca thất bại"),
  });

  const sessionList = sessions || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Quản lý ca" description="Quản lý ca bán hàng POS">
        {currentSession ? (
          <Button variant="destructive" onClick={() => setCloseDialogOpen(true)}>
            <Square className="mr-2 h-4 w-4" /> Đóng ca
          </Button>
        ) : (
          <Button onClick={() => setOpenDialogOpen(true)}>
            <Play className="mr-2 h-4 w-4" /> Mở ca
          </Button>
        )}
      </PageHeader>

      {/* Current session */}
      {currentSession && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Ca hiện tại
              <Badge variant="default">Đang mở</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
              <div className="grid gap-4 sm:grid-cols-5">
              <div>
                <p className="text-sm text-muted-foreground">Nhân viên</p>
                <p className="font-medium">{currentSession.user_name || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mở lúc</p>
                <p className="font-medium">{formatDateTime(currentSession.opened_at)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tiền đầu ca</p>
                <p className="font-medium">{formatVND(currentSession.opening_amount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Doanh thu</p>
                <p className="text-xl font-bold">{formatVND(currentSession.total_sales)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Số đơn</p>
                <p className="text-xl font-bold">{currentSession.total_orders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> Lịch sử ca
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Đang tải...</p>
          ) : sessionList.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Chưa có lịch sử ca bán hàng
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 font-medium">Nhân viên</th>
                    <th className="text-left p-3 font-medium">Mở ca</th>
                    <th className="text-left p-3 font-medium">Đóng ca</th>
                    <th className="text-right p-3 font-medium">Tiền đầu ca</th>
                    <th className="text-right p-3 font-medium">Tiền cuối ca</th>
                    <th className="text-right p-3 font-medium">Doanh thu</th>
                    <th className="text-right p-3 font-medium">Số đơn</th>
                    <th className="text-right p-3 font-medium">Chênh lệch</th>
                    <th className="text-center p-3 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionList.map((s: POSSessionResponse) => (
                    <tr key={s.id} className="border-t">
                      <td className="p-3 font-medium">{s.user_name || "—"}</td>
                      <td className="p-3 text-xs">{formatDateTime(s.opened_at)}</td>
                      <td className="p-3 text-xs">
                        {s.closed_at ? formatDateTime(s.closed_at) : "—"}
                      </td>
                      <td className="p-3 text-right">{formatVND(s.opening_amount)}</td>
                      <td className="p-3 text-right">
                        {s.closing_amount != null ? formatVND(s.closing_amount) : "—"}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {formatVND(s.total_sales)}
                      </td>
                      <td className="p-3 text-right">{s.total_orders}</td>
                      <td className="p-3 text-right">
                        {s.difference != null ? (
                          <span
                            className={
                              s.difference === 0
                                ? "text-green-600"
                                : s.difference > 0
                                ? "text-blue-600"
                                : "text-red-600"
                            }
                          >
                            {s.difference > 0 ? "+" : ""}
                            {formatVND(s.difference)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={s.status === "open" ? "default" : "secondary"}>
                          {s.status === "open" ? "Đang mở" : "Đã đóng"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open session dialog */}
      <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mở ca bán hàng</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              openMutation.mutate({
                opening_amount: openingAmount,
                notes: notes || undefined,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Tiền đầu ca (VNĐ) *</Label>
              <Input
                type="number"
                value={openingAmount || ""}
                onChange={(e) => setOpeningAmount(Number(e.target.value))}
                placeholder="500000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú ca..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={openMutation.isPending}>
                {openMutation.isPending ? "Đang mở..." : "Mở ca"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close session dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Đóng ca bán hàng</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              closeMutation.mutate({
                closing_amount: closingAmount,
                notes: notes || undefined,
              });
            }}
            className="space-y-4"
          >
            {currentSession && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Doanh thu ca</span>
                  <span className="font-medium">{formatVND(currentSession.total_sales)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Số đơn hàng</span>
                  <span className="font-medium">{currentSession.total_orders}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tiền đầu ca</span>
                  <span className="font-medium">{formatVND(currentSession.opening_amount)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">Kỳ vọng cuối ca</span>
                  <span className="font-bold">
                    {formatVND(
                      currentSession.opening_amount + currentSession.total_sales
                    )}
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Tiền cuối ca thực tế (VNĐ) *</Label>
              <Input
                type="number"
                value={closingAmount || ""}
                onChange={(e) => setClosingAmount(Number(e.target.value))}
                placeholder="Nhập số tiền kiểm đếm..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú đóng ca..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCloseDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="destructive" disabled={closeMutation.isPending}>
                {closeMutation.isPending ? "Đang đóng..." : "Đóng ca"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
