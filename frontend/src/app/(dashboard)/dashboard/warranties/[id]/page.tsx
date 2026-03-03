"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Shield,
  User,
  Package,
  Clock,
  Plus,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Wrench,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { warrantyService } from "@/services/warranty-service";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { WarrantyClaimResponse } from "@/types/api";

const warrantyStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Còn bảo hành", variant: "default" },
  expiring: { label: "Sắp hết hạn", variant: "secondary" },
  expired: { label: "Hết hạn", variant: "destructive" },
  voided: { label: "Đã hủy", variant: "outline" },
};

const claimStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  pending: { label: "Chờ xử lý", variant: "secondary", icon: <Clock className="h-4 w-4" /> },
  received: { label: "Đã nhận máy", variant: "outline", icon: <Package className="h-4 w-4" /> },
  processing: { label: "Đang sửa chữa", variant: "secondary", icon: <Wrench className="h-4 w-4" /> },
  completed: { label: "Hoàn thành", variant: "default", icon: <CheckCircle2 className="h-4 w-4" /> },
  rejected: { label: "Từ chối", variant: "destructive", icon: <XCircle className="h-4 w-4" /> },
  returned: { label: "Đã trả máy", variant: "default", icon: <CheckCircle2 className="h-4 w-4" /> },
};

const CLAIM_FLOW = ["pending", "received", "processing", "completed", "returned"] as const;
const CLAIM_STATUSES = ["pending", "received", "processing", "completed", "rejected", "returned"] as const;

function ClaimStatusFlow({ currentStatus }: { currentStatus: string }) {
  const currentIdx = CLAIM_FLOW.indexOf(currentStatus as typeof CLAIM_FLOW[number]);
  const isRejected = currentStatus === "rejected";

  return (
    <div className="flex items-center gap-1 py-3 overflow-x-auto">
      {CLAIM_FLOW.map((step, idx) => {
        const isActive = step === currentStatus;
        const isPast = idx < currentIdx && !isRejected;
        const cs = claimStatusMap[step];

        return (
          <div key={step} className="flex items-center">
            {idx > 0 && (
              <div className={`h-0.5 w-6 sm:w-10 ${isPast ? "bg-primary" : "bg-muted"}`} />
            )}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isPast
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {cs.icon}
              <span className="hidden sm:inline">{cs.label}</span>
            </div>
          </div>
        );
      })}
      {isRejected && (
        <div className="flex items-center">
          <div className="h-0.5 w-6 sm:w-10 bg-destructive/50" />
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-destructive text-destructive-foreground whitespace-nowrap">
            <XCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Từ chối</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WarrantyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [createClaimOpen, setCreateClaimOpen] = useState(false);
  const [claimIssue, setClaimIssue] = useState("");
  const [claimDescription, setClaimDescription] = useState("");
  const [voidOpen, setVoidOpen] = useState(false);

  // Update claim state
  const [updateClaimId, setUpdateClaimId] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState("");
  const [updateResolution, setUpdateResolution] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");

  // Return claim state
  const [returnClaimId, setReturnClaimId] = useState<string | null>(null);
  const [returnNotes, setReturnNotes] = useState("");

  const { data: warranty, isLoading } = useQuery({
    queryKey: ["warranty", id],
    queryFn: () => warrantyService.getById(id),
  });

  const voidMutation = useMutation({
    mutationFn: () => warrantyService.void(id),
    onSuccess: () => {
      toast.success("Đã hủy phiếu bảo hành");
      queryClient.invalidateQueries({ queryKey: ["warranty", id] });
      setVoidOpen(false);
    },
    onError: () => toast.error("Hủy bảo hành thất bại"),
  });

  const createClaimMutation = useMutation({
    mutationFn: () =>
      warrantyService.createClaim(id, {
        issue: claimIssue,
        description: claimDescription || undefined,
      }),
    onSuccess: () => {
      toast.success("Đã tạo yêu cầu bảo hành");
      queryClient.invalidateQueries({ queryKey: ["warranty", id] });
      setCreateClaimOpen(false);
      setClaimIssue("");
      setClaimDescription("");
    },
    onError: () => toast.error("Tạo yêu cầu thất bại"),
  });

  const updateClaimMutation = useMutation({
    mutationFn: () =>
      warrantyService.updateClaim(updateClaimId!, {
        status: updateStatus as "pending" | "received" | "processing" | "completed" | "rejected" | "returned" | undefined,
        resolution: updateResolution || undefined,
        technician_notes: updateNotes || undefined,
      }),
    onSuccess: () => {
      toast.success("Đã cập nhật yêu cầu bảo hành");
      queryClient.invalidateQueries({ queryKey: ["warranty", id] });
      setUpdateClaimId(null);
    },
    onError: () => toast.error("Cập nhật thất bại"),
  });

  const returnClaimMutation = useMutation({
    mutationFn: () =>
      warrantyService.returnClaim(returnClaimId!, returnNotes || undefined),
    onSuccess: () => {
      toast.success("Đã trả máy cho khách hàng");
      queryClient.invalidateQueries({ queryKey: ["warranty", id] });
      setReturnClaimId(null);
      setReturnNotes("");
    },
    onError: () => toast.error("Trả máy thất bại"),
  });

  const openUpdateClaim = (claim: WarrantyClaimResponse) => {
    setUpdateClaimId(claim.id);
    setUpdateStatus(claim.status);
    setUpdateResolution(claim.resolution || "");
    setUpdateNotes(claim.technician_notes || "");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-60" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-60" />
          <Skeleton className="h-60" />
        </div>
      </div>
    );
  }

  if (!warranty) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Không tìm thấy phiếu bảo hành</p>
        <Button variant="link" onClick={() => router.back()}>
          Quay lại
        </Button>
      </div>
    );
  }

  const ws = warrantyStatusMap[warranty.status] || { label: warranty.status, variant: "secondary" as const };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bảo hành: ${warranty.warranty_code}`}
        description={`Phiếu bảo hành #${warranty.warranty_code}`}
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>
        {warranty.status === "active" && (
          <>
            <Button onClick={() => setCreateClaimOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Tạo yêu cầu BH
            </Button>
            <Button variant="destructive" onClick={() => setVoidOpen(true)}>
              Hủy bảo hành
            </Button>
          </>
        )}
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Warranty info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> Thông tin bảo hành
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Mã bảo hành</dt>
                <dd className="font-mono font-medium">{warranty.warranty_code}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Trạng thái</dt>
                <dd>
                  <Badge variant={ws.variant}>
                    {ws.label}
                    {warranty.days_remaining > 0 && warranty.status === "active" &&
                      ` (${warranty.days_remaining} ngày)`}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Số serial</dt>
                <dd className="font-mono">{warranty.serial_number || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Thời hạn</dt>
                <dd>{warranty.warranty_months} tháng</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Ngày bắt đầu</dt>
                <dd>{formatDate(warranty.start_date)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Ngày hết hạn</dt>
                <dd>{formatDate(warranty.end_date)}</dd>
              </div>
              {warranty.terms && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">Điều khoản</dt>
                  <dd className="text-sm mt-1">{warranty.terms}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Customer info */}
          {warranty.customer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" /> Khách hàng
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{warranty.customer.full_name}</p>
                <p className="text-sm text-muted-foreground">{warranty.customer.phone}</p>
                {warranty.customer.email && (
                  <p className="text-sm text-muted-foreground">{warranty.customer.email}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Product info */}
          {warranty.product_variant && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" /> Sản phẩm
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{warranty.product_variant.name}</p>
                <p className="text-sm text-muted-foreground font-mono">
                  SKU: {warranty.product_variant.sku}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Claims */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" /> Yêu cầu bảo hành ({warranty.claims?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!warranty.claims?.length ? (
            <p className="text-center text-muted-foreground py-8">
              Chưa có yêu cầu bảo hành nào
            </p>
          ) : (
            <div className="space-y-4">
              {warranty.claims.map((claim) => {
                const cs = claimStatusMap[claim.status] || {
                  label: claim.status,
                  variant: "secondary" as const,
                  icon: null,
                };
                return (
                  <div
                    key={claim.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    {/* Status flow */}
                    <ClaimStatusFlow currentStatus={claim.status} />

                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-medium">
                            {claim.claim_number}
                          </span>
                          <Badge variant={cs.variant} className="gap-1">
                            {cs.icon}
                            {cs.label}
                          </Badge>
                        </div>
                        <p className="font-medium">{claim.issue}</p>
                        {claim.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {claim.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {(claim.status === "completed" || claim.status === "rejected") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReturnClaimId(claim.id)}
                          >
                            <RotateCcw className="mr-1 h-3 w-3" /> Trả máy
                          </Button>
                        )}
                        {claim.status !== "returned" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openUpdateClaim(claim)}
                          >
                            Cập nhật
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3 text-sm">
                      {claim.received_date && (
                        <div>
                          <span className="text-muted-foreground">Nhận máy: </span>
                          {formatDate(claim.received_date)}
                        </div>
                      )}
                      {claim.completed_date && (
                        <div>
                          <span className="text-muted-foreground">Hoàn thành: </span>
                          {formatDate(claim.completed_date)}
                        </div>
                      )}
                      {claim.returned_date && (
                        <div>
                          <span className="text-muted-foreground">Trả máy: </span>
                          {formatDate(claim.returned_date)}
                        </div>
                      )}
                    </div>

                    {claim.resolution && (
                      <div className="bg-muted/50 rounded p-3 text-sm">
                        <p className="font-medium text-xs text-muted-foreground mb-1">
                          Kết quả xử lý
                        </p>
                        <p>{claim.resolution}</p>
                      </div>
                    )}
                    {claim.technician_notes && (
                      <div className="bg-muted/50 rounded p-3 text-sm">
                        <p className="font-medium text-xs text-muted-foreground mb-1">
                          Ghi chú kỹ thuật
                        </p>
                        <p>{claim.technician_notes}</p>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Tạo lúc: {formatDateTime(claim.created_at)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create claim dialog */}
      <Dialog open={createClaimOpen} onOpenChange={setCreateClaimOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo yêu cầu bảo hành</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createClaimMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Vấn đề *</Label>
              <Input
                value={claimIssue}
                onChange={(e) => setClaimIssue(e.target.value)}
                placeholder="Mô tả ngắn gọn vấn đề..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Mô tả chi tiết</Label>
              <Textarea
                value={claimDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setClaimDescription(e.target.value)}
                placeholder="Mô tả chi tiết tình trạng sản phẩm..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateClaimOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={createClaimMutation.isPending}>
                {createClaimMutation.isPending ? "Đang tạo..." : "Tạo yêu cầu"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update claim dialog */}
      <Dialog open={!!updateClaimId} onOpenChange={(open) => !open && setUpdateClaimId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cập nhật yêu cầu bảo hành</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateClaimMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select value={updateStatus} onValueChange={setUpdateStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLAIM_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {claimStatusMap[s]?.label || s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kết quả xử lý</Label>
              <Textarea
                value={updateResolution}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUpdateResolution(e.target.value)}
                placeholder="Mô tả kết quả xử lý..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Ghi chú kỹ thuật</Label>
              <Textarea
                value={updateNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUpdateNotes(e.target.value)}
                placeholder="Ghi chú kỹ thuật viên..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setUpdateClaimId(null)}>
                Hủy
              </Button>
              <Button type="submit" disabled={updateClaimMutation.isPending}>
                {updateClaimMutation.isPending ? "Đang lưu..." : "Cập nhật"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Void confirmation */}
      <ConfirmDialog
        open={voidOpen}
        onOpenChange={setVoidOpen}
        title="Hủy phiếu bảo hành"
        description="Bạn có chắc chắn muốn hủy phiếu bảo hành này? Hành động không thể hoàn tác."
        confirmLabel="Hủy bảo hành"
        onConfirm={() => voidMutation.mutate()}
        isLoading={voidMutation.isPending}
        variant="destructive"
      />

      {/* Return claim dialog */}
      <Dialog open={!!returnClaimId} onOpenChange={(open) => { if (!open) { setReturnClaimId(null); setReturnNotes(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trả máy cho khách hàng</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              returnClaimMutation.mutate();
            }}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              Xác nhận đã trả máy cho khách hàng sau khi hoàn tất bảo hành.
            </p>
            <div className="space-y-2">
              <Label>Ghi chú trả máy</Label>
              <Textarea
                value={returnNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnNotes(e.target.value)}
                placeholder="Ghi chú khi trả máy (tùy chọn)..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setReturnClaimId(null); setReturnNotes(""); }}>
                Hủy
              </Button>
              <Button type="submit" disabled={returnClaimMutation.isPending}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {returnClaimMutation.isPending ? "Đang xử lý..." : "Xác nhận trả máy"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
