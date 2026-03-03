"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Truck,
  Phone,
  Mail,
  MapPin,
  Building2,
  CreditCard,
  Package,
  DollarSign,
  FileText,
  Save,
  Banknote,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { DataTable, type Column } from "@/components/data-table";
import {
  supplierService,
  type UpdateSupplierRequest,
  type SupplierDebtSummary,
} from "@/services/supplier-service";
import { formatVND, formatDate, formatDateTime } from "@/lib/utils";
import type { PurchaseOrderResponse } from "@/types/api";

const poStatusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft: { label: "Nháp", variant: "secondary" },
  confirmed: { label: "Đã duyệt", variant: "default" },
  received: { label: "Đã nhận hàng", variant: "default" },
  cancelled: { label: "Đã hủy", variant: "destructive" },
};

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const supplierId = params.id as string;

  const initialTab = searchParams.get("tab") || "info";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [poPage, setPoPage] = useState(1);

  // Edit form state
  const [editForm, setEditForm] = useState<UpdateSupplierRequest>({});
  const [isEditing, setIsEditing] = useState(initialTab === "edit");

  const { data: supplier, isLoading } = useQuery({
    queryKey: ["suppliers", supplierId],
    queryFn: () => supplierService.getById(supplierId),
    enabled: !!supplierId,
  });

  const { data: poData, isLoading: poLoading } = useQuery({
    queryKey: ["suppliers", supplierId, "purchase-orders", poPage],
    queryFn: () =>
      supplierService.getPurchaseOrders(supplierId, { page: poPage, limit: 10 }),
    enabled: !!supplierId,
  });

  const { data: debtSummary, isLoading: debtLoading } = useQuery({
    queryKey: ["suppliers", supplierId, "debt-summary"],
    queryFn: () => supplierService.getDebtSummary(supplierId),
    enabled: !!supplierId,
  });

  // Sync form with supplier data
  useEffect(() => {
    if (supplier) {
      setEditForm({
        name: supplier.name,
        contact_name: supplier.contact_name,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        tax_code: supplier.tax_code,
        bank_account: supplier.bank_account,
        bank_name: supplier.bank_name,
        notes: supplier.notes,
        is_active: supplier.is_active,
      });
    }
  }, [supplier]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateSupplierRequest) =>
      supplierService.update(supplierId, data),
    onSuccess: () => {
      toast.success("Đã cập nhật nhà cung cấp");
      queryClient.invalidateQueries({ queryKey: ["suppliers", supplierId] });
      setIsEditing(false);
    },
    onError: () => toast.error("Cập nhật thất bại"),
  });

  const poColumns: Column<PurchaseOrderResponse>[] = [
    {
      key: "order_number",
      header: "Mã phiếu nhập",
      render: (po) => (
        <button
          className="font-mono font-medium text-sm text-primary hover:underline"
          onClick={() => router.push(`/dashboard/purchase-orders/${po.id}`)}
        >
          {po.po_number || po.order_number || po.id.slice(0, 8)}
        </button>
      ),
    },
    {
      key: "items",
      header: "Sản phẩm",
      className: "text-center",
      render: (po) => `${po.items?.length || 0} SP`,
    },
    {
      key: "total",
      header: "Tổng tiền",
      className: "text-right",
      render: (po) => (
        <span className="font-medium">{formatVND(po.total_amount)}</span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (po) => {
        const s = poStatusMap[po.status] || {
          label: po.status,
          variant: "secondary" as const,
        };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: "expected_date",
      header: "Ngày dự kiến",
      render: (po) => (
        <span className="text-muted-foreground text-sm">
          {po.expected_date ? formatDate(po.expected_date) : "—"}
        </span>
      ),
    },
    {
      key: "received_date",
      header: "Ngày nhận",
      render: (po) => (
        <span className="text-muted-foreground text-sm">
          {po.received_date ? formatDate(po.received_date) : "—"}
        </span>
      ),
    },
    {
      key: "date",
      header: "Ngày tạo",
      render: (po) => (
        <span className="text-muted-foreground text-sm">
          {formatDateTime(po.created_at)}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Không tìm thấy nhà cung cấp</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Quay lại
        </Button>
      </div>
    );
  }

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
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{supplier.name}</h1>
                <p className="text-sm text-muted-foreground">
                  Hợp tác từ {formatDate(supplier.created_at)}
                </p>
              </div>
              <Badge variant={supplier.is_active ? "default" : "secondary"}>
                {supplier.is_active ? "Đang hợp tác" : "Ngừng hợp tác"}
              </Badge>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/dashboard/purchase-orders/create?supplier_id=${supplierId}`)}
        >
          <Package className="mr-2 h-4 w-4" />
          Tạo đơn nhập hàng
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tổng đơn nhập</p>
              <p className="text-xl font-bold">{debtSummary?.total_orders || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Đã nhận hàng</p>
              <p className="text-xl font-bold">
                {formatVND(debtSummary?.received_amount || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Đang chờ nhận</p>
              <p className="text-xl font-bold">
                {formatVND(debtSummary?.pending_amount || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tổng giá trị</p>
              <p className="text-xl font-bold">
                {formatVND(debtSummary?.total_amount || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">
            <Building2 className="mr-2 h-4 w-4" />
            Thông tin
          </TabsTrigger>
          <TabsTrigger value="purchase-orders">
            <Package className="mr-2 h-4 w-4" />
            Lịch sử nhập hàng ({poData?.pagination?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="debt">
            <DollarSign className="mr-2 h-4 w-4" />
            Công nợ
          </TabsTrigger>
        </TabsList>

        {/* ====== TAB: Thông tin ====== */}
        <TabsContent value="info" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Contact Info */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-4 w-4" />
                  Thông tin liên hệ
                </CardTitle>
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    Chỉnh sửa
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateMutation.mutate(editForm);
                    }}
                    className="space-y-4"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Tên nhà cung cấp</Label>
                        <Input
                          value={editForm.name || ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Người liên hệ</Label>
                        <Input
                          value={editForm.contact_name || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              contact_name: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Số điện thoại</Label>
                        <Input
                          value={editForm.phone || ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, phone: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={editForm.email || ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, email: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Địa chỉ</Label>
                        <Input
                          value={editForm.address || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              address: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <Separator />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Mã số thuế</Label>
                        <Input
                          value={editForm.tax_code || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              tax_code: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ngân hàng</Label>
                        <Input
                          value={editForm.bank_name || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              bank_name: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Số tài khoản</Label>
                        <Input
                          value={editForm.bank_account || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              bank_account: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Ghi chú</Label>
                      <Textarea
                        value={editForm.notes || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, notes: e.target.value })
                        }
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label>Trạng thái hợp tác</Label>
                      <Switch
                        checked={editForm.is_active ?? supplier.is_active}
                        onCheckedChange={(checked) =>
                          setEditForm({ ...editForm, is_active: checked })
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {editForm.is_active ? "Đang hợp tác" : "Ngừng hợp tác"}
                      </span>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        Hủy
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateMutation.isPending}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4 text-sm">
                    {supplier.contact_name && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Người liên hệ:{" "}
                          <strong>{supplier.contact_name}</strong>
                        </span>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={`tel:${supplier.phone}`}
                          className="text-primary hover:underline"
                        >
                          {supplier.phone}
                        </a>
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={`mailto:${supplier.email}`}
                          className="text-primary hover:underline"
                        >
                          {supplier.email}
                        </a>
                      </div>
                    )}
                    {supplier.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{supplier.address}</span>
                      </div>
                    )}
                    {supplier.notes && (
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="text-muted-foreground">
                          {supplier.notes}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" />
                  Thông tin tài chính
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {supplier.tax_code && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mã số thuế</span>
                    <span className="font-mono font-medium">
                      {supplier.tax_code}
                    </span>
                  </div>
                )}
                {supplier.bank_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ngân hàng</span>
                    <span className="font-medium">{supplier.bank_name}</span>
                  </div>
                )}
                {supplier.bank_account && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Số tài khoản</span>
                    <span className="font-mono font-medium">
                      {supplier.bank_account}
                    </span>
                  </div>
                )}
                {!supplier.tax_code &&
                  !supplier.bank_name &&
                  !supplier.bank_account && (
                    <p className="text-muted-foreground text-center py-4">
                      Chưa có thông tin tài chính
                    </p>
                  )}

                <Separator />

                {/* Quick debt overview */}
                {debtLoading ? (
                  <Skeleton className="h-20" />
                ) : debtSummary ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Tổng quan công nợ</p>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Tổng đơn nhập hàng
                      </span>
                      <span className="font-bold">
                        {debtSummary.total_orders}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Tổng giá trị nhập
                      </span>
                      <span className="font-bold text-primary">
                        {formatVND(debtSummary.total_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Đã nhận hàng
                      </span>
                      <span className="font-bold text-green-600">
                        {formatVND(debtSummary.received_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Đang chờ xử lý
                      </span>
                      <span className="font-bold text-amber-600">
                        {formatVND(debtSummary.pending_amount)}
                      </span>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ====== TAB: Lịch sử nhập hàng ====== */}
        <TabsContent value="purchase-orders" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                Lịch sử nhập hàng từ {supplier.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={poColumns}
                data={poData?.data || []}
                isLoading={poLoading}
                page={poPage}
                limit={10}
                total={poData?.pagination?.total || 0}
                onPageChange={setPoPage}
                keyExtractor={(po) => po.id}
                emptyMessage="Chưa có đơn nhập hàng nào từ nhà cung cấp này"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== TAB: Công nợ ====== */}
        <TabsContent value="debt" className="mt-6">
          <div className="space-y-6">
            {/* Debt Summary Cards */}
            {debtLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            ) : debtSummary ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ClipboardList className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-muted-foreground">
                          Tổng đơn hàng
                        </span>
                      </div>
                      <p className="text-2xl font-bold">
                        {debtSummary.total_orders}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Trị giá {formatVND(debtSummary.total_amount)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-muted-foreground">
                          Đã nhận hàng
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {debtSummary.received_orders}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Trị giá {formatVND(debtSummary.received_amount)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-amber-500">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <span className="text-sm text-muted-foreground">
                          Đang xử lý
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-amber-600">
                        {debtSummary.draft_orders + debtSummary.confirmed_orders}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Trị giá {formatVND(debtSummary.pending_amount)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-muted-foreground">
                          Đã hủy
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-red-600">
                        {debtSummary.cancelled_orders}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <DollarSign className="h-4 w-4" />
                      Chi tiết công nợ
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Progress bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Tiến độ nhận hàng
                          </span>
                          <span className="font-medium">
                            {debtSummary.total_amount > 0
                              ? Math.round(
                                  (debtSummary.received_amount /
                                    debtSummary.total_amount) *
                                    100
                                )
                              : 0}
                            %
                          </span>
                        </div>
                        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all duration-500"
                            style={{
                              width: `${
                                debtSummary.total_amount > 0
                                  ? (debtSummary.received_amount /
                                      debtSummary.total_amount) *
                                    100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      <Separator />

                      {/* Breakdown table */}
                      <div className="grid gap-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gray-400" />
                            <span className="text-sm">Nháp</span>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {debtSummary.draft_orders} đơn
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-sm">Đã duyệt (chờ nhận)</span>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {debtSummary.confirmed_orders} đơn
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-sm">Đã nhận hàng</span>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {debtSummary.received_orders} đơn
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatVND(debtSummary.received_amount)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span className="text-sm">Đã hủy</span>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {debtSummary.cancelled_orders} đơn
                            </p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex justify-between items-center py-2">
                        <span className="font-medium">
                          Tổng giá trị giao dịch
                        </span>
                        <span className="text-lg font-bold text-primary">
                          {formatVND(debtSummary.total_amount)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Chưa có dữ liệu công nợ
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
