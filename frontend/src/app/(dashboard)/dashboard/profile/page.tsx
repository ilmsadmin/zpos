"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Lock, Shield, Mail, Phone, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { authService } from "@/services/auth-service";
import { useAuthStore } from "@/stores/auth-store";
import { formatDateTime } from "@/lib/utils";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => authService.getProfile(),
  });

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    onSuccess: () => {
      toast.success("Đã đổi mật khẩu thành công");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: () => toast.error("Đổi mật khẩu thất bại. Vui lòng kiểm tra mật khẩu hiện tại."),
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }
    changePasswordMutation.mutate();
  };

  const displayUser = profile || user;
  const initials = displayUser?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hồ sơ cá nhân"
        description="Quản lý thông tin tài khoản và bảo mật"
      />

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Thông tin</TabsTrigger>
          <TabsTrigger value="security">Bảo mật</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Profile card */}
            <Card className="md:col-span-1">
              <CardContent className="flex flex-col items-center py-8">
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                </Avatar>
                <h3 className="text-lg font-semibold">{displayUser?.full_name}</h3>
                <p className="text-sm text-muted-foreground">{displayUser?.email}</p>
                {displayUser?.role && (
                  <Badge className="mt-2">{displayUser.role.display_name}</Badge>
                )}
              </CardContent>
            </Card>

            {/* Detail card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" /> Thông tin chi tiết
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Họ và tên</dt>
                      <dd className="font-medium">{displayUser?.full_name || "—"}</dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Email</dt>
                      <dd className="font-medium">{displayUser?.email || "—"}</dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Số điện thoại</dt>
                      <dd className="font-medium">{displayUser?.phone || "—"}</dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Vai trò</dt>
                      <dd className="font-medium">
                        {displayUser?.role?.display_name || "—"}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Đăng nhập lần cuối</dt>
                      <dd className="font-medium">
                        {displayUser?.last_login_at
                          ? formatDateTime(displayUser.last_login_at)
                          : "—"}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Ngày tạo</dt>
                      <dd className="font-medium">
                        {displayUser?.created_at
                          ? formatDateTime(displayUser.created_at)
                          : "—"}
                      </dd>
                    </div>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>

          {/* Permissions */}
          {displayUser?.role?.permissions && displayUser.role.permissions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" /> Quyền hạn
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {displayUser.role.permissions.map((p) => (
                    <Badge key={p} variant="outline" className="text-xs">
                      {p}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" /> Đổi mật khẩu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Mật khẩu hiện tại</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mật khẩu mới</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Xác nhận mật khẩu mới</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </div>
                <Button type="submit" disabled={changePasswordMutation.isPending}>
                  {changePasswordMutation.isPending
                    ? "Đang đổi mật khẩu..."
                    : "Đổi mật khẩu"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
