"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Phone,
  MapPin,
  Truck,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  supplierService,
  type SupplierResponse,
  type CreateSupplierRequest,
} from "@/services/supplier-service";

export default function SuppliersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState<CreateSupplierRequest>({
    name: "",
    phone: "",
    contact_name: "",
    email: "",
    address: "",
    tax_code: "",
    bank_account: "",
    bank_name: "",
    notes: "",
  });

  const resetForm = () => {
    setForm({
      name: "",
      phone: "",
      contact_name: "",
      email: "",
      address: "",
      tax_code: "",
      bank_account: "",
      bank_name: "",
      notes: "",
    });
  };

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers", page, search],
    queryFn: () =>
      supplierService.list({
        page,
        limit: 20,
        search: search || undefined,
      } as Record<string, string | number | boolean>),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateSupplierRequest) => supplierService.create(data),
    onSuccess: () => {
      toast.success("Đã thêm nhà cung cấp");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setCreateOpen(false);
      resetForm();
    },
    onError: () => toast.error("Thêm nhà cung cấp thất bại"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supplierService.delete(id),
    onSuccess: () => {
      toast.success("Đã xóa nhà cung cấp");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setDeleteId(null);
    },
    onError: () => toast.error("Xóa nhà cung cấp thất bại"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      supplierService.update(id, { is_active }),
    onSuccess: (_, variables) => {
      toast.success(
        variables.is_active ? "Đã kích hoạt nhà cung cấp" : "Đã ngừng hợp tác"
      );
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: () => toast.error("Cập nhật trạng thái thất bại"),
  });

  const suppliers = data?.data || [];
  const total = data?.pagination?.total || 0;

  const columns: Column<SupplierResponse>[] = [
    {
      key: "name",
      header: "Nhà cung cấp",
      render: (s) => (
        <div>
          <button
            className="font-medium text-primary hover:underline text-left"
            onClick={() => router.push(`/dashboard/suppliers/${s.id}`)}
          >
            {s.name}
          </button>
          {s.address && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[200px]">{s.address}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "contact",
      header: "Liên hệ",
      render: (s) => (
        <div className="space-y-0.5">
          {s.contact_name && (
            <p className="text-sm font-medium">{s.contact_name}</p>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            {s.phone}
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (s) => (
        <span className="text-sm text-muted-foreground">{s.email || "—"}</span>
      ),
    },
    {
      key: "tax_code",
      header: "Mã số thuế",
      render: (s) => (
        <span className="font-mono text-sm">{s.tax_code || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (s) => (
        <Badge variant={s.is_active ? "default" : "secondary"}>
          {s.is_active ? "Đang hợp tác" : "Ngừng hợp tác"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      render: (s) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => router.push(`/dashboard/suppliers/${s.id}`)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Xem chi tiết
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                router.push(`/dashboard/suppliers/${s.id}?tab=edit`)
              }
            >
              <Pencil className="mr-2 h-4 w-4" />
              Chỉnh sửa
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                toggleStatusMutation.mutate({
                  id: s.id,
                  is_active: !s.is_active,
                })
              }
            >
              {s.is_active ? (
                <>
                  <ToggleLeft className="mr-2 h-4 w-4" />
                  Ngừng hợp tác
                </>
              ) : (
                <>
                  <ToggleRight className="mr-2 h-4 w-4" />
                  Kích hoạt lại
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteId(s.id)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhà cung cấp"
        description="Quản lý nhà cung cấp, lịch sử nhập hàng và công nợ"
      >
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Thêm nhà cung cấp
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Thêm nhà cung cấp mới</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tên nhà cung cấp *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    required
                    placeholder="Công ty ABC"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Số điện thoại *</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    required
                    placeholder="0912345678"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Người liên hệ</Label>
                  <Input
                    value={form.contact_name || ""}
                    onChange={(e) =>
                      setForm({ ...form, contact_name: e.target.value })
                    }
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email || ""}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="info@abc.com"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Địa chỉ</Label>
                  <Input
                    value={form.address || ""}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    placeholder="123 Nguyễn Huệ, Q.1, TP.HCM"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mã số thuế</Label>
                  <Input
                    value={form.tax_code || ""}
                    onChange={(e) =>
                      setForm({ ...form, tax_code: e.target.value })
                    }
                    placeholder="0123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ngân hàng</Label>
                  <Input
                    value={form.bank_name || ""}
                    onChange={(e) =>
                      setForm({ ...form, bank_name: e.target.value })
                    }
                    placeholder="Vietcombank"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Số tài khoản</Label>
                  <Input
                    value={form.bank_account || ""}
                    onChange={(e) =>
                      setForm({ ...form, bank_account: e.target.value })
                    }
                    placeholder="0123456789"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Ghi chú</Label>
                  <Textarea
                    value={form.notes || ""}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    placeholder="Ghi chú về nhà cung cấp..."
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Đang tạo..." : "Tạo nhà cung cấp"}
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
            <Truck className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Tổng nhà cung cấp</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Đang hợp tác</p>
            <p className="text-2xl font-bold text-green-600">
              {suppliers.filter((s) => s.is_active).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Ngừng hợp tác</p>
            <p className="text-2xl font-bold text-muted-foreground">
              {suppliers.filter((s) => !s.is_active).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên, người liên hệ, SĐT, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={suppliers}
        isLoading={isLoading}
        page={page}
        limit={20}
        total={total}
        onPageChange={setPage}
        keyExtractor={(s) => s.id}
        emptyMessage="Chưa có nhà cung cấp nào"
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Xóa nhà cung cấp"
        description="Bạn có chắc chắn muốn xóa nhà cung cấp này? Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
