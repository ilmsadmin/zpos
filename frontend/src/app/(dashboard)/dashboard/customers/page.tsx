"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { customerService } from "@/services/customer-service";
import { formatVND } from "@/lib/utils";
import type { CustomerResponse, CreateCustomerRequest } from "@/types/api";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getGroup(totalSpent: number): { label: string; variant: "default" | "secondary" | "outline" } {
  if (totalSpent >= 100_000_000) return { label: "VIP", variant: "default" };
  if (totalSpent >= 20_000_000) return { label: "Thân thiết", variant: "secondary" };
  return { label: "Mới", variant: "outline" };
}

export default function CustomersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<CreateCustomerRequest>({
    full_name: "",
    phone: "",
    email: "",
    address: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["customers", page, search],
    queryFn: () =>
      customerService.list({
        page,
        limit: 20,
        search: search || undefined,
      } as Record<string, string | number | boolean>),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCustomerRequest) => customerService.create(data),
    onSuccess: () => {
      toast.success("Đã thêm khách hàng");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setCreateOpen(false);
      setForm({ full_name: "", phone: "", email: "", address: "" });
    },
    onError: () => toast.error("Thêm khách hàng thất bại"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customerService.delete(id),
    onSuccess: () => {
      toast.success("Đã xóa khách hàng");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setDeleteId(null);
    },
    onError: () => toast.error("Xóa khách hàng thất bại"),
  });

  const customers = data?.data || [];
  const total = data?.pagination?.total || 0;

  const columns: Column<CustomerResponse>[] = [
    {
      key: "name",
      header: "Khách hàng",
      render: (c) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs">{getInitials(c.full_name)}</AvatarFallback>
          </Avatar>
          <button
            className="font-medium text-primary hover:underline text-left"
            onClick={() => router.push(`/dashboard/customers/${c.id}`)}
          >
            {c.full_name}
          </button>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Liên hệ",
      render: (c) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-sm">
            <Phone className="h-3 w-3 text-muted-foreground" />
            {c.phone}
          </div>
          {c.email && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              {c.email}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "orders",
      header: "Đơn hàng",
      className: "text-center",
      render: (c) => c.order_count,
    },
    {
      key: "total_spent",
      header: "Tổng chi tiêu",
      className: "text-right",
      render: (c) => <span className="font-medium">{formatVND(c.total_spent)}</span>,
    },
    {
      key: "points",
      header: "Điểm",
      className: "text-right",
      render: (c) => c.points,
    },
    {
      key: "group",
      header: "Nhóm",
      render: (c) => {
        const g = getGroup(c.total_spent);
        return <Badge variant={g.variant}>{g.label}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Khách hàng"
        description="Quản lý thông tin khách hàng"
      >
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Thêm khách hàng
            </Button>
          </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Thêm khách hàng mới</DialogTitle>
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
                    <Label>Họ và tên *</Label>
                    <Input
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Số điện thoại *</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.email || ""}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Địa chỉ</Label>
                    <Input
                      value={form.address || ""}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Hủy
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Đang tạo..." : "Tạo khách hàng"}
                  </Button>
                </div>
              </form>
          </DialogContent>
        </Dialog>
      </PageHeader>      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tổng khách hàng</p>
            <p className="text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Khách VIP</p>
            <p className="text-2xl font-bold">
              {customers.filter((c) => c.total_spent >= 100_000_000).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tổng chi tiêu</p>
            <p className="text-2xl font-bold">
              {formatVND(customers.reduce((sum, c) => sum + c.total_spent, 0))}
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
              placeholder="Tìm theo tên, SĐT, email..."
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
        data={customers}
        isLoading={isLoading}
        page={page}
        limit={20}
        total={total}
        onPageChange={setPage}
        keyExtractor={(c) => c.id}
        emptyMessage="Chưa có khách hàng nào"
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Xóa khách hàng"
        description="Bạn có chắc chắn muốn xóa khách hàng này? Hành động không thể hoàn tác."
        confirmLabel="Xóa"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
