"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Save, User, Shield, Bell, Palette, Store, Sun, Moon, Monitor } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/page-header";
import { useAuthStore } from "@/stores/auth-store";
import { authService } from "@/services/auth-service";
import { storeService } from "@/services/store-service";
import { notificationService } from "@/services/notification-service";
import { cn } from "@/lib/utils";
import type { NotificationPreferences } from "@/types/api";

// --- Notification preferences (server-backed) ---
const defaultNotificationPrefs: NotificationPreferences = {
  new_order: true,
  low_stock: true,
  warranty_expiry: false,
  warranty_request: true,
  daily_report: false,
};

// --- Language preference (localStorage) ---
const LANGUAGE_STORAGE_KEY = "zplus-language";

function loadLanguage(): string {
  if (typeof window === "undefined") return "vi";
  return localStorage.getItem(LANGUAGE_STORAGE_KEY) || "vi";
}

function saveLanguage(lang: string) {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
}

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // ─── Profile ───────────────────────────────
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  // Sync profile form when user changes (e.g. after mutation)
  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: () =>
      authService.updateProfile({
        full_name: profileForm.full_name,
        phone: profileForm.phone,
      }),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      toast.success("Đã cập nhật hồ sơ thành công");
    },
    onError: () => toast.error("Không thể cập nhật hồ sơ"),
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.full_name.trim()) {
      toast.error("Họ và tên không được để trống");
      return;
    }
    updateProfileMutation.mutate();
  };

  // ─── Store ─────────────────────────────────
  const [storeForm, setStoreForm] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
    tax_code: "",
    currency: "VND",
    vat: "10",
  });

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

  // ─── Security ──────────────────────────────
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

  // ─── Notifications ─────────────────────────
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(defaultNotificationPrefs);

  const { data: serverNotifPrefs } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => notificationService.getPreferences(),
  });

  useEffect(() => {
    if (serverNotifPrefs) {
      setNotifPrefs(serverNotifPrefs);
    }
  }, [serverNotifPrefs]);

  const saveNotifPrefsMutation = useMutation({
    mutationFn: (prefs: NotificationPreferences) =>
      notificationService.savePreferences(prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });

  const toggleNotif = (key: keyof NotificationPreferences) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    saveNotifPrefsMutation.mutate(updated);
    toast.success(
      updated[key] ? "Đã bật thông báo" : "Đã tắt thông báo"
    );
  };

  const notificationItems: { key: keyof NotificationPreferences; title: string; desc: string }[] = [
    { key: "new_order", title: "Đơn hàng mới", desc: "Nhận thông báo khi có đơn hàng mới" },
    { key: "low_stock", title: "Tồn kho thấp", desc: "Cảnh báo khi sản phẩm sắp hết hàng" },
    { key: "warranty_expiry", title: "Bảo hành hết hạn", desc: "Nhắc nhở khi bảo hành sắp hết hạn" },
    { key: "warranty_request", title: "Yêu cầu bảo hành", desc: "Thông báo yêu cầu bảo hành mới" },
    { key: "daily_report", title: "Báo cáo hàng ngày", desc: "Gửi email báo cáo doanh thu cuối ngày" },
  ];

  // ─── Language ──────────────────────────────
  const [language, setLanguage] = useState("vi");

  useEffect(() => {
    setLanguage(loadLanguage());
  }, []);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    saveLanguage(lang);
    toast.success(lang === "vi" ? "Đã chuyển sang Tiếng Việt" : "Switched to English");
  };

  // ─── Render ────────────────────────────────
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

        {/* ── Profile ─────────────────────────── */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cá nhân</CardTitle>
              <CardDescription>Cập nhật thông tin tài khoản của bạn</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Họ và tên</Label>
                    <Input
                      id="profile-name"
                      value={profileForm.full_name}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, full_name: e.target.value })
                      }
                      placeholder="Nhập họ và tên"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-email">Email</Label>
                    <Input
                      id="profile-email"
                      value={profileForm.email}
                      type="email"
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-phone">Số điện thoại</Label>
                    <Input
                      id="profile-phone"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, phone: e.target.value })
                      }
                      placeholder="Nhập số điện thoại"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vai trò</Label>
                    <Input
                      defaultValue={user?.role?.display_name || ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
                <Separator />
                <Button type="submit" disabled={updateProfileMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateProfileMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Store ───────────────────────────── */}
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

        {/* ── Security ────────────────────────── */}
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

        {/* ── Notifications ───────────────────── */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Cài đặt thông báo</CardTitle>
              <CardDescription>Quản lý cách bạn nhận thông báo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {notificationItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-3 border-b last:border-0"
                  >
                    <div className="space-y-0.5 pr-4">
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notifPrefs[item.key]}
                      onCheckedChange={() => toggleNotif(item.key)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Appearance ──────────────────────── */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Giao diện</CardTitle>
              <CardDescription>Tùy chỉnh giao diện ứng dụng</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme selector */}
              <div className="space-y-3">
                <Label>Chế độ hiển thị</Label>
                {mounted && (
                  <div className="grid grid-cols-3 gap-3 max-w-md">
                    <button
                      type="button"
                      onClick={() => setTheme("light")}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors hover:bg-accent",
                        theme === "light"
                          ? "border-primary bg-accent"
                          : "border-muted"
                      )}
                    >
                      <Sun className="h-6 w-6" />
                      <span className="text-sm font-medium">Sáng</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("dark")}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors hover:bg-accent",
                        theme === "dark"
                          ? "border-primary bg-accent"
                          : "border-muted"
                      )}
                    >
                      <Moon className="h-6 w-6" />
                      <span className="text-sm font-medium">Tối</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("system")}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors hover:bg-accent",
                        theme === "system"
                          ? "border-primary bg-accent"
                          : "border-muted"
                      )}
                    >
                      <Monitor className="h-6 w-6" />
                      <span className="text-sm font-medium">Hệ thống</span>
                    </button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Language */}
              <div className="space-y-2">
                <Label>Ngôn ngữ</Label>
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-[240px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vi">🇻🇳 Tiếng Việt</SelectItem>
                    <SelectItem value="en">🇺🇸 English</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Tính năng đa ngôn ngữ sẽ được hỗ trợ trong phiên bản tới
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
