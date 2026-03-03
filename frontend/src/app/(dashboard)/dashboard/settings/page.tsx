"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, User, Shield, Bell, Palette, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { useAuthStore } from "@/stores/auth-store";
import { authService } from "@/services/auth-service";
import { storeService } from "@/services/store-service";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Profile form
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  // Store form
  const [storeForm, setStoreForm] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
    tax_code: "",
    currency: "VND",
    vat: "10",
  });

  // Fetch store data
  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: () => storeService.getAll(),
  });

  const currentStore = stores?.find((s) => s.id === user?.store_id) || stores?.[0];

  useEffect(() => {
    if (currentStore) {
      setStoreForm({
        name: currentStore.name || "",
        phone: currentStore.phone || "",
        address: currentStore.address || "",
        email: currentStore.email || "",
        tax_code: (currentStore.settings?.tax_code as string) || "",
        currency: (currentStore.settings?.currency as string) || "VND",
        vat: (currentStore.settings?.vat_rate as string) || "10",
      });
    }
  }, [currentStore]);

  const updateStoreMutation = useMutation({
    mutationFn: () => {
      if (!currentStore) throw new Error("No store");
      return storeService.update(currentStore.id, {
        name: storeForm.name,
        phone: storeForm.phone,
        address: storeForm.address,
        email: storeForm.email,
        settings: {
          ...currentStore.settings,
          tax_code: storeForm.tax_code,
          currency: storeForm.currency,
          vat_rate: storeForm.vat,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      toast.success("Đã cập nhật thông tin cửa hàng");
    },
    onError: () => toast.error("Không thể cập nhật thông tin cửa hàng"),
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      authService.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      }),
    onSuccess: () => {
      toast.success("Đã đổi mật khẩu thành công");
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    },
    onError: () => toast.error("Đổi mật khẩu thất bại. Kiểm tra lại mật khẩu hiện tại."),
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    if (passwordForm.new_password.length < 8) {
      toast.error("Mật khẩu mới phải có ít nhất 8 ký tự");
      return;
    }
    changePasswordMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Cài đặt" description="Quản lý cấu hình hệ thống" />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" /> Hồ sơ
          </TabsTrigger>
          <TabsTrigger value="store" className="gap-2">
            <Store className="h-4 w-4" /> Cửa hàng
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" /> Bảo mật
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" /> Thông báo
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" /> Giao diện
          </TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cá nhân</CardTitle>
              <CardDescription>Cập nhật thông tin tài khoản của bạn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Họ và tên</Label>
                  <Input
                    value={profileForm.full_name}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, full_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={profileForm.email} type="email" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Số điện thoại</Label>
                  <Input
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vai trò</Label>
                  <Input defaultValue={user?.role?.display_name || ""} disabled />
                </div>
              </div>
              <Separator />
              <Button onClick={() => toast.info("Chức năng cập nhật hồ sơ sẽ được triển khai")}>
                <Save className="mr-2 h-4 w-4" />
                Lưu thay đổi
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store */}
        <TabsContent value="store">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cửa hàng</CardTitle>
              <CardDescription>Cấu hình thông tin cửa hàng</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tên cửa hàng</Label>
                  <Input
                    value={storeForm.name}
                    onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Số điện thoại</Label>
                  <Input
                    value={storeForm.phone}
                    onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Địa chỉ</Label>
                  <Input
                    value={storeForm.address}
                    onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={storeForm.email}
                    onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                    type="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mã số thuế</Label>
                  <Input
                    value={storeForm.tax_code}
                    onChange={(e) => setStoreForm({ ...storeForm, tax_code: e.target.value })}
                  />
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tiền tệ</Label>
                  <Select
                    value={storeForm.currency}
                    onValueChange={(v) => setStoreForm({ ...storeForm, currency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VND">VND - Việt Nam Đồng</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Thuế VAT (%)</Label>
                  <Input
                    type="number"
                    value={storeForm.vat}
                    onChange={(e) => setStoreForm({ ...storeForm, vat: e.target.value })}
                  />
                </div>
              </div>
              <Separator />
              <Button
                onClick={() => updateStoreMutation.mutate()}
                disabled={updateStoreMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {updateStoreMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Đổi mật khẩu</CardTitle>
              <CardDescription>Cập nhật mật khẩu tài khoản</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Mật khẩu hiện tại</Label>
                  <Input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, current_password: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mật khẩu mới</Label>
                  <Input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, new_password: e.target.value })
                    }
                    required
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Xác nhận mật khẩu mới</Label>
                  <Input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                    }
                    required
                  />
                </div>
                <Separator />
                <Button type="submit" disabled={changePasswordMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {changePasswordMutation.isPending ? "Đang xử lý..." : "Đổi mật khẩu"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Cài đặt thông báo</CardTitle>
              <CardDescription>Quản lý cách bạn nhận thông báo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: "Đơn hàng mới", desc: "Nhận thông báo khi có đơn hàng mới" },
                  { title: "Tồn kho thấp", desc: "Cảnh báo khi sản phẩm sắp hết hàng" },
                  { title: "Bảo hành hết hạn", desc: "Nhắc nhở khi bảo hành sắp hết hạn" },
                  { title: "Yêu cầu bảo hành", desc: "Thông báo yêu cầu bảo hành mới" },
                  { title: "Báo cáo hàng ngày", desc: "Gửi email báo cáo doanh thu cuối ngày" },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center justify-between py-3 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Bật
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Giao diện</CardTitle>
              <CardDescription>Tùy chỉnh giao diện ứng dụng</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Chế độ</Label>
                <Select defaultValue="system">
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Sáng</SelectItem>
                    <SelectItem value="dark">Tối</SelectItem>
                    <SelectItem value="system">Theo hệ thống</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ngôn ngữ</Label>
                <Select defaultValue="vi">
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vi">Tiếng Việt</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
