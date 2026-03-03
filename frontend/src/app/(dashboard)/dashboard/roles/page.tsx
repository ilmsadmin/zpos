"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Shield, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { roleService } from "@/services/user-service";
import type { RoleResponse } from "@/types/api";

// All available permissions
const ALL_PERMISSIONS = [
  { group: "Sản phẩm", permissions: ["product.read", "product.create", "product.update", "product.delete"] },
  { group: "Đơn hàng", permissions: ["order.read", "order.create", "order.cancel", "order.refund"] },
  { group: "Khách hàng", permissions: ["customer.read", "customer.create", "customer.update", "customer.delete"] },
  { group: "Kho hàng", permissions: ["inventory.read", "inventory.update", "inventory.import", "inventory.export"] },
  { group: "Nhà cung cấp", permissions: ["supplier.read", "supplier.create", "supplier.update", "supplier.delete"] },
  { group: "Bảo hành", permissions: ["warranty.read", "warranty.create", "warranty.update"] },
  { group: "Nhân viên", permissions: ["user.read", "user.create", "user.update", "user.delete"] },
  { group: "Cửa hàng", permissions: ["store.read", "store.update"] },
  { group: "Báo cáo", permissions: ["report.read"] },
  { group: "POS", permissions: ["pos.access"] },
  { group: "Kiểm kê", permissions: ["stocktake"] },
];

const permissionLabels: Record<string, string> = {
  "product.read": "Xem", "product.create": "Tạo", "product.update": "Sửa", "product.delete": "Xóa",
  "order.read": "Xem", "order.create": "Tạo", "order.cancel": "Hủy", "order.refund": "Hoàn tiền",
  "customer.read": "Xem", "customer.create": "Tạo", "customer.update": "Sửa", "customer.delete": "Xóa",
  "inventory.read": "Xem", "inventory.update": "Cập nhật", "inventory.import": "Nhập hàng", "inventory.export": "Xuất hàng",
  "supplier.read": "Xem", "supplier.create": "Tạo", "supplier.update": "Sửa", "supplier.delete": "Xóa",
  "warranty.read": "Xem", "warranty.create": "Tạo", "warranty.update": "Sửa",
  "user.read": "Xem", "user.create": "Tạo", "user.update": "Sửa", "user.delete": "Xóa",
  "store.read": "Xem", "store.update": "Sửa",
  "report.read": "Xem báo cáo",
  "pos.access": "Truy cập POS",
  "stocktake": "Kiểm kê",
};

export default function RolesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleResponse | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    display_name: "",
    description: "",
    permissions: [] as string[],
  });

  const queryClient = useQueryClient();

  const { data: roles, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => roleService.list(),
  });

  const createMutation = useMutation({
    mutationFn: roleService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Đã tạo vai trò mới");
      closeDialog();
    },
    onError: () => toast.error("Không thể tạo vai trò"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof roleService.update>[1] }) =>
      roleService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Đã cập nhật vai trò");
      closeDialog();
    },
    onError: () => toast.error("Không thể cập nhật vai trò"),
  });

  const deleteMutation = useMutation({
    mutationFn: roleService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Đã xóa vai trò");
      setDeleteId(null);
    },
    onError: () => toast.error("Không thể xóa vai trò"),
  });

  const openCreateDialog = () => {
    setEditingRole(null);
    setFormData({ name: "", display_name: "", description: "", permissions: [] });
    setDialogOpen(true);
  };

  const openEditDialog = (role: RoleResponse) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      display_name: role.display_name,
      description: role.description || "",
      permissions: role.permissions || [],
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRole(null);
  };

  const togglePermission = (perm: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const toggleGroupPermissions = (perms: string[]) => {
    const allSelected = perms.every((p) => formData.permissions.includes(p));
    if (allSelected) {
      setFormData((prev) => ({
        ...prev,
        permissions: prev.permissions.filter((p) => !perms.includes(p)),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...perms])],
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRole) {
      updateMutation.mutate({
        id: editingRole.id,
        data: {
          display_name: formData.display_name,
          description: formData.description,
          permissions: formData.permissions,
        },
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        display_name: formData.display_name,
        description: formData.description,
        permissions: formData.permissions,
      });
    }
  };

  const columns: Column<RoleResponse>[] = [
    {
      key: "name",
      header: "Vai trò",
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <p className="font-medium">{r.display_name || r.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{r.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: "description",
      header: "Mô tả",
      render: (r) => <span className="text-muted-foreground">{r.description || "—"}</span>,
    },
    {
      key: "permissions",
      header: "Quyền hạn",
      render: (r) => (
        <span className="text-sm text-muted-foreground">
          {r.permissions?.length || 0} quyền
        </span>
      ),
    },
    {
      key: "type",
      header: "Loại",
      render: (r) => (
        <Badge variant={r.is_system ? "default" : "outline"}>
          {r.is_system ? "Hệ thống" : "Tùy chỉnh"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      render: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditDialog(r)}>
              <Pencil className="mr-2 h-4 w-4" />
              Chỉnh sửa
            </DropdownMenuItem>
            {!r.is_system && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setDeleteId(r.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý vai trò"
        description="Thiết lập vai trò và phân quyền cho nhân viên"
      >
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo vai trò
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={roles || []}
            isLoading={isLoading}
            total={roles?.length || 0}
            keyExtractor={(r) => r.id}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? "Chỉnh sửa vai trò" : "Tạo vai trò mới"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên hệ thống *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="manager"
                  required
                  disabled={!!editingRole}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Tên hiển thị *</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Quản lý"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả vai trò..."
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-base font-semibold">Phân quyền</Label>
              {ALL_PERMISSIONS.map((group) => {
                const allSelected = group.permissions.every((p) =>
                  formData.permissions.includes(p)
                );
                return (
                  <div key={group.group} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => toggleGroupPermissions(group.permissions)}
                        className="rounded"
                      />
                      <span className="font-medium text-sm">{group.group}</span>
                    </div>
                    <div className="ml-6 flex flex-wrap gap-3">
                      {group.permissions.map((perm) => (
                        <label
                          key={perm}
                          className="flex items-center gap-1.5 text-sm text-muted-foreground"
                        >
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(perm)}
                            onChange={() => togglePermission(perm)}
                            className="rounded"
                          />
                          {permissionLabels[perm] || perm}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Đang xử lý..."
                  : editingRole
                  ? "Cập nhật"
                  : "Tạo mới"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Xóa vai trò"
        description="Bạn có chắc muốn xóa vai trò này? Nhân viên thuộc vai trò này sẽ bị ảnh hưởng."
        variant="destructive"
        confirmLabel="Xóa"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
