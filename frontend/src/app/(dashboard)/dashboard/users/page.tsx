"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Label } from "@/components/ui/label";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { userService, roleService } from "@/services/user-service";
import { formatDateTime } from "@/lib/utils";
import type { UserResponse, RoleResponse } from "@/types/api";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role_id: "",
    is_active: true,
  });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["users", page, search],
    queryFn: () =>
      userService.list({
        page,
        limit: 20,
        search: search || undefined,
      } as Record<string, string | number | boolean>),
  });

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => roleService.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof userService.create>[0]) =>
      userService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Đã tạo nhân viên mới");
      closeDialog();
    },
    onError: () => toast.error("Không thể tạo nhân viên"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof userService.update>[1] }) =>
      userService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Đã cập nhật nhân viên");
      closeDialog();
    },
    onError: () => toast.error("Không thể cập nhật nhân viên"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Đã xóa nhân viên");
      setDeleteId(null);
    },
    onError: () => toast.error("Không thể xóa nhân viên"),
  });

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData({
      email: "",
      password: "",
      full_name: "",
      phone: "",
      role_id: roles?.[0]?.id || "",
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (user: UserResponse) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: "",
      full_name: user.full_name,
      phone: user.phone || "",
      role_id: user.role?.id || "",
      is_active: user.is_active,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id,
        data: {
          full_name: formData.full_name,
          phone: formData.phone || undefined,
          role_id: formData.role_id || undefined,
          is_active: formData.is_active,
        },
      });
    } else {
      createMutation.mutate({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone || undefined,
        role_id: formData.role_id,
        is_active: formData.is_active,
      });
    }
  };

  const columns: Column<UserResponse>[] = [
    {
      key: "name",
      header: "Nhân viên",
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-medium">
            {u.full_name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2) || "U"}
          </div>
          <div>
            <p className="font-medium">{u.full_name}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Số điện thoại",
      render: (u) => u.phone || "—",
    },
    {
      key: "role",
      header: "Vai trò",
      render: (u) => (
        <Badge variant="outline">{u.role?.display_name || u.role?.name || "—"}</Badge>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (u) => (
        <Badge variant={u.is_active ? "default" : "secondary"}>
          {u.is_active ? "Hoạt động" : "Ngừng hoạt động"}
        </Badge>
      ),
    },
    {
      key: "last_login",
      header: "Lần đăng nhập cuối",
      render: (u) =>
        u.last_login_at ? formatDateTime(u.last_login_at) : "Chưa đăng nhập",
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      render: (u) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditDialog(u)}>
              <Pencil className="mr-2 h-4 w-4" />
              Chỉnh sửa
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteId(u.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const users = data?.data || [];
  const total = data?.pagination?.total || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý nhân viên"
        description="Quản lý tài khoản nhân viên và phân quyền"
      >
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm nhân viên
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm nhân viên..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>

          <DataTable
            columns={columns}
            data={users}
            isLoading={isLoading}
            page={page}
            limit={20}
            total={total}
            onPageChange={setPage}
            keyExtractor={(u) => u.id}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Chỉnh sửa nhân viên" : "Thêm nhân viên mới"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Họ tên *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="Nguyễn Văn A"
                required
              />
            </div>

            {!editingUser && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="email@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Tối thiểu 8 ký tự"
                    required
                    minLength={8}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="0901234567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Vai trò *</Label>
              <Select
                value={formData.role_id}
                onValueChange={(v) => setFormData({ ...formData, role_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((role: RoleResponse) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.display_name || role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="is_active">Tài khoản hoạt động</Label>
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
                  : editingUser
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
        title="Xóa nhân viên"
        description="Bạn có chắc muốn xóa nhân viên này? Thao tác này không thể hoàn tác."
        variant="destructive"
        confirmLabel="Xóa"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
