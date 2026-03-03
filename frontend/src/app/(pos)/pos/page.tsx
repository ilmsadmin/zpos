"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Wallet,
  QrCode,
  User,
  ShoppingCart,
  Package,
  Play,
  Square,
  Clock,
  DollarSign,
  ShoppingBag,
  ArrowLeft,
  Maximize,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { productService } from "@/services/product-service";
import { orderService } from "@/services/order-service";
import { customerService } from "@/services/customer-service";
import { categoryService } from "@/services/category-service";
import {
  posSessionService,
  type OpenPOSSessionRequest,
  type ClosePOSSessionRequest,
} from "@/services/pos-session-service";
import { usePOSStore, type CartItem } from "@/stores/pos-store";
import { ReceiptPrinter } from "@/components/receipt-printer";
import { formatVND, formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type {
  ProductResponse,
  VariantResponse,
  CategoryResponse,
  OrderResponse,
} from "@/types/api";

// Flatten category tree to a flat list with all IDs
function flattenCategoryTree(cats: CategoryResponse[]): CategoryResponse[] {
  const result: CategoryResponse[] = [];
  function walk(list: CategoryResponse[]) {
    for (const c of list) {
      result.push(c);
      if (c.children?.length) walk(c.children);
    }
  }
  walk(cats);
  return result;
}

// Get only top-level categories for the POS tab bar
function getTopLevelCategories(cats: CategoryResponse[]): CategoryResponse[] {
  return cats;
}

export default function FullscreenPOSPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "card" | "transfer"
  >("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [quickAddMode, setQuickAddMode] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({
    full_name: "",
    phone: "",
  });

  // Variant selector state
  const [variantDialogProduct, setVariantDialogProduct] =
    useState<ProductResponse | null>(null);

  // Receipt state
  const [receiptOrder, setReceiptOrder] = useState<OrderResponse | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Session state
  const [openSessionDialog, setOpenSessionDialog] = useState(false);
  const [closeSessionDialog, setCloseSessionDialog] = useState(false);
  const [openingAmount, setOpeningAmount] = useState(0);
  const [closingAmount, setClosingAmount] = useState(0);
  const [sessionNotes, setSessionNotes] = useState("");

  // Fetch current POS session
  const { data: currentSession, isLoading: sessionLoading } = useQuery({
    queryKey: ["pos-session-current"],
    queryFn: () => posSessionService.getCurrent().catch(() => null),
    retry: false,
  });

  const openSessionMutation = useMutation({
    mutationFn: (data: OpenPOSSessionRequest) => posSessionService.open(data),
    onSuccess: () => {
      toast.success("Đã mở ca bán hàng");
      queryClient.invalidateQueries({ queryKey: ["pos-session-current"] });
      queryClient.invalidateQueries({ queryKey: ["pos-sessions"] });
      setOpenSessionDialog(false);
      setOpeningAmount(0);
      setSessionNotes("");
    },
    onError: () => toast.error("Mở ca thất bại"),
  });

  const closeSessionMutation = useMutation({
    mutationFn: (data: ClosePOSSessionRequest) =>
      posSessionService.close(currentSession!.id, data),
    onSuccess: () => {
      toast.success("Đã đóng ca bán hàng");
      queryClient.invalidateQueries({ queryKey: ["pos-session-current"] });
      queryClient.invalidateQueries({ queryKey: ["pos-sessions"] });
      setCloseSessionDialog(false);
      setClosingAmount(0);
      setSessionNotes("");
    },
    onError: () => toast.error("Đóng ca thất bại"),
  });

  const {
    items,
    customer,
    discountType,
    discountValue,
    subTotal,
    discountAmount,
    totalAmount,
    addItem,
    removeItem,
    updateQuantity,
    setCustomer,
    setDiscount,
    clearCart,
  } = usePOSStore();

  // Fetch products
  const { data: productData, isLoading: productsLoading } = useQuery({
    queryKey: ["pos-products", search, activeCategory],
    queryFn: () =>
      productService.list({
        limit: 50,
        search: search || undefined,
        category_id: activeCategory !== "all" ? activeCategory : undefined,
        is_active: true,
      } as Record<string, string | number | boolean>),
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["pos-categories"],
    queryFn: () => categoryService.getTree(),
  });

  // Customer search
  const { data: customerResults } = useQuery({
    queryKey: ["customer-search", customerSearch],
    queryFn: () => customerService.search(customerSearch),
    enabled: customerSearch.length >= 2,
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: orderService.create,
    onSuccess: (order) => {
      toast.success(`Đã tạo đơn hàng ${order.order_number}`);
      clearCart();
      setPaymentOpen(false);
      setCashReceived("");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
      queryClient.invalidateQueries({ queryKey: ["pos-session-current"] });
      setReceiptOrder(order);
      setReceiptOpen(true);
    },
    onError: () => toast.error("Tạo đơn hàng thất bại"),
  });

  // Quick-add customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: customerService.create,
    onSuccess: (newCustomer) => {
      toast.success(`Đã thêm khách hàng "${newCustomer.full_name}"`);
      setCustomer(newCustomer);
      setCustomerDialogOpen(false);
      setQuickAddMode(false);
      setQuickAddForm({ full_name: "", phone: "" });
      setCustomerSearch("");
      queryClient.invalidateQueries({ queryKey: ["customer-search"] });
    },
    onError: () => toast.error("Không thể thêm khách hàng. Vui lòng kiểm tra lại thông tin."),
  });

  const handleQuickAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddForm.full_name.trim()) {
      toast.error("Vui lòng nhập tên khách hàng");
      return;
    }
    if (!quickAddForm.phone.trim()) {
      toast.error("Vui lòng nhập số điện thoại");
      return;
    }
    createCustomerMutation.mutate({
      full_name: quickAddForm.full_name.trim(),
      phone: quickAddForm.phone.trim(),
    });
  };

  const products = productData?.data || [];
  const categories = categoriesData || [];
  const topCategories = useMemo(
    () => getTopLevelCategories(categories),
    [categories]
  );

  // Add a specific variant to the cart
  const addVariantToCart = useCallback(
    (product: ProductResponse, variant: VariantResponse) => {
      const cartItem: CartItem = {
        product_variant_id: variant.id,
        quantity: 1,
        unit_price: variant.selling_price,
        product_name: product.name,
        variant_name: variant.name,
        sku: variant.sku,
        available_qty: variant.inventory?.available_qty ?? 0,
      };
      addItem(cartItem);
    },
    [addItem]
  );

  // When clicking a product card
  const handleProductClick = useCallback(
    (product: ProductResponse) => {
      const activeVariants = (product.variants || []).filter(
        (v) => v.is_active
      );
      if (activeVariants.length === 0) return;

      if (activeVariants.length === 1) {
        const variant = activeVariants[0];
        const stock = variant.inventory?.available_qty ?? 0;
        if (stock <= 0) {
          toast.error("Sản phẩm đã hết hàng");
          return;
        }
        addVariantToCart(product, variant);
      } else {
        setVariantDialogProduct(product);
      }
    },
    [addVariantToCart]
  );

  const handlePayment = () => {
    if (items.length === 0) return;

    const cashAmount =
      paymentMethod === "cash"
        ? Number(cashReceived) || totalAmount
        : totalAmount;

    createOrderMutation.mutate({
      customer_id: customer?.id,
      pos_session_id: currentSession?.id,
      discount_type: discountType || undefined,
      discount_value: discountValue || undefined,
      items: items.map((item) => ({
        product_variant_id: item.product_variant_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_type: item.discount_type,
        discount_value: item.discount_value,
      })),
      payments: [
        {
          method: paymentMethod,
          amount: cashAmount,
        },
      ],
    });
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const change =
    paymentMethod === "cash" && Number(cashReceived) > totalAmount
      ? Number(cashReceived) - totalAmount
      : 0;

  // Loading state
  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-3">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Đang kiểm tra ca bán hàng...</p>
        </div>
      </div>
    );
  }

  // No open session — gate
  if (!currentSession) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="absolute top-4 left-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại Dashboard
          </Button>
        </div>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Chưa mở ca bán hàng</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Bạn cần mở ca trước khi sử dụng POS. Vui lòng nhập tiền đầu ca và
              mở ca để bắt đầu bán hàng.
            </p>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                openSessionMutation.mutate({
                  opening_amount: openingAmount,
                  notes: sessionNotes || undefined,
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
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Ghi chú ca..."
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={openSessionMutation.isPending}
              >
                <Play className="mr-2 h-5 w-5" />
                {openSessionMutation.isPending
                  ? "Đang mở ca..."
                  : "Mở ca bán hàng"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar - POS Header */}
      <div className="flex items-center justify-between bg-card border-b px-4 py-2 h-14 flex-shrink-0">
        {/* Left: Logo + Back */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push("/dashboard")}
            title="Quay lại Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">Z+</span>
            </div>
            <span className="font-bold text-base hidden sm:inline">Zplus POS</span>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <Badge variant="default" className="gap-1">
            <Clock className="h-3 w-3" /> Ca đang mở
          </Badge>
        </div>

        {/* Center: Session info */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            NV:{" "}
            <span className="font-medium text-foreground">
              {currentSession.user_name || user?.full_name || "—"}
            </span>
          </span>
          <span className="text-muted-foreground hidden lg:inline">
            Mở lúc:{" "}
            <span className="font-medium text-foreground">
              {formatDateTime(currentSession.opened_at)}
            </span>
          </span>
          <span className="text-muted-foreground">
            <DollarSign className="h-3 w-3 inline" /> Doanh thu:{" "}
            <span className="font-bold text-primary">
              {formatVND(currentSession.total_sales)}
            </span>
          </span>
          <span className="text-muted-foreground hidden md:inline">
            <ShoppingBag className="h-3 w-3 inline" /> Đơn:{" "}
            <span className="font-bold">{currentSession.total_orders}</span>
          </span>
        </div>

        {/* Right: Close session */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCloseSessionDialog(true)}
          >
            <Square className="mr-1 h-3 w-3" /> Đóng ca
          </Button>
        </div>
      </div>

      {/* Main POS layout - fills remaining height */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Product grid */}
        <div className="flex-1 flex flex-col min-w-0 p-4 gap-3">
          {/* Search + Barcode */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm sản phẩm hoặc quét mã vạch..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10"
                autoFocus
              />
            </div>
            <Button variant="outline" size="icon" className="h-10 w-10">
              <QrCode className="h-4 w-4" />
            </Button>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 flex-shrink-0">
            <Button
              variant={activeCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory("all")}
              className="whitespace-nowrap"
            >
              Tất cả
            </Button>
            {topCategories.map((cat) => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(cat.id)}
                className="whitespace-nowrap"
              >
                {cat.name}
                {cat.children && cat.children.length > 0 && (
                  <span className="ml-1 text-xs opacity-60">
                    +{cat.children.length}
                  </span>
                )}
              </Button>
            ))}
          </div>

          {/* Product grid */}
          <ScrollArea className="flex-1">
            {productsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-3">
                      <Skeleton className="aspect-square rounded-lg mb-2" />
                      <Skeleton className="h-4 w-3/4 mb-1" />
                      <Skeleton className="h-3 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <ShoppingCart className="h-16 w-16 mb-3 opacity-50" />
                <p className="text-base">Không tìm thấy sản phẩm</p>
                <p className="text-sm mt-1">Thử tìm kiếm với từ khóa khác</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                {products.map((product) => {
                  const activeVariants = (product.variants || []).filter(
                    (v) => v.is_active
                  );
                  const totalStock = activeVariants.reduce(
                    (sum, v) => sum + (v.inventory?.available_qty ?? 0),
                    0
                  );
                  const hasMultipleVariants = activeVariants.length > 1;
                  const prices = activeVariants.map((v) => v.selling_price);
                  const minPrice = Math.min(...(prices.length ? prices : [0]));
                  const maxPrice = Math.max(...(prices.length ? prices : [0]));
                  const outOfStock = totalStock <= 0;

                  return (
                    <Card
                      key={product.id}
                      className={`cursor-pointer hover:border-primary/50 hover:shadow-md transition-all ${outOfStock ? "opacity-50" : ""}`}
                      onClick={() =>
                        !outOfStock && handleProductClick(product)
                      }
                    >
                      <CardContent className="p-3">
                        <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center relative">
                          <Package className="h-8 w-8 text-muted-foreground" />
                          {hasMultipleVariants && (
                            <Badge
                              variant="secondary"
                              className="absolute top-1 right-1 text-[10px] px-1.5 py-0"
                            >
                              {activeVariants.length} phiên bản
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium truncate">
                          {product.name}
                        </p>
                        {!hasMultipleVariants && activeVariants[0] && (
                          <p className="text-xs text-muted-foreground truncate">
                            {activeVariants[0].sku}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm font-bold text-primary">
                            {minPrice === maxPrice
                              ? formatVND(minPrice)
                              : `${formatVND(minPrice)} - ${formatVND(maxPrice)}`}
                          </p>
                          <Badge
                            variant={
                              totalStock === 0
                                ? "destructive"
                                : totalStock <= 5
                                  ? "outline"
                                  : "secondary"
                            }
                            className="text-xs"
                          >
                            {totalStock}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right: Cart panel */}
        <div className="w-[400px] xl:w-[420px] flex flex-col flex-shrink-0 border-l bg-card">
          {/* Cart header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-base">Giỏ hàng</h2>
              <Badge variant="secondary">{itemCount}</Badge>
            </div>
            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive h-7 text-xs"
                onClick={clearCart}
              >
                <Trash2 className="h-3 w-3 mr-1" /> Xóa tất cả
              </Button>
            )}
          </div>

          {/* Customer selector */}
          <div className="px-4 py-2 border-b">
            <Dialog
              open={customerDialogOpen}
              onOpenChange={(open) => {
                setCustomerDialogOpen(open);
                if (!open) {
                  setQuickAddMode(false);
                  setQuickAddForm({ full_name: "", phone: "" });
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                >
                  <User className="h-4 w-4" />
                  {customer ? customer.full_name : "Chọn khách hàng"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>
                    {quickAddMode ? "Thêm khách hàng mới" : "Chọn khách hàng"}
                  </DialogTitle>
                </DialogHeader>

                {/* Quick-add form */}
                {quickAddMode ? (
                  <form onSubmit={handleQuickAddCustomer} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="qa-name">Họ và tên *</Label>
                      <Input
                        id="qa-name"
                        placeholder="Nhập tên khách hàng"
                        value={quickAddForm.full_name}
                        onChange={(e) =>
                          setQuickAddForm({ ...quickAddForm, full_name: e.target.value })
                        }
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qa-phone">Số điện thoại *</Label>
                      <Input
                        id="qa-phone"
                        placeholder="Nhập số điện thoại"
                        value={quickAddForm.phone}
                        onChange={(e) =>
                          setQuickAddForm({ ...quickAddForm, phone: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setQuickAddMode(false)}
                      >
                        Quay lại
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={createCustomerMutation.isPending}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        {createCustomerMutation.isPending ? "Đang thêm..." : "Thêm nhanh"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  /* Search mode */
                  <div className="space-y-3">
                    <Input
                      placeholder="Tìm theo tên hoặc SĐT..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {customerResults?.map((c) => (
                        <Button
                          key={c.id}
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => {
                            setCustomer(c);
                            setCustomerDialogOpen(false);
                            setCustomerSearch("");
                          }}
                        >
                          <div className="text-left">
                            <p className="font-medium">{c.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.phone}
                            </p>
                          </div>
                        </Button>
                      ))}
                      {customerSearch.length >= 2 &&
                        !customerResults?.length && (
                          <div className="text-center py-4 space-y-2">
                            <p className="text-sm text-muted-foreground">
                              Không tìm thấy khách hàng
                            </p>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setQuickAddMode(true);
                                // Pre-fill phone if the search looks like a phone number
                                const isPhone = /^[0-9+\s-]{7,}$/.test(customerSearch.trim());
                                setQuickAddForm({
                                  full_name: isPhone ? "" : customerSearch.trim(),
                                  phone: isPhone ? customerSearch.trim() : "",
                                });
                              }}
                            >
                              <Plus className="mr-1 h-4 w-4" />
                              Thêm khách hàng mới
                            </Button>
                          </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-1">
                      {customer && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setCustomer(null);
                            setCustomerDialogOpen(false);
                          }}
                        >
                          Bỏ chọn khách hàng
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-muted-foreground"
                        onClick={() => {
                          setQuickAddMode(true);
                          setQuickAddForm({ full_name: "", phone: "" });
                        }}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Thêm khách hàng mới
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {/* Cart items */}
          <ScrollArea className="flex-1">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mb-2 opacity-30" />
                <p className="text-sm font-medium">Giỏ hàng trống</p>
                <p className="text-xs mt-1">Chọn sản phẩm để thêm vào giỏ</p>
              </div>
            ) : (
              <div className="space-y-0 divide-y">
                {items.map((item) => {
                  const atMax =
                    item.available_qty > 0 &&
                    item.quantity >= item.available_qty;
                  return (
                    <div
                      key={item.product_variant_id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.product_name}
                        </p>
                        {item.variant_name &&
                          item.variant_name !== "Default" && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.variant_name}
                            </p>
                          )}
                        <p className="text-xs text-primary font-medium mt-0.5">
                          {formatVND(item.unit_price)} × {item.quantity} ={" "}
                          {formatVND(item.unit_price * item.quantity)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Kho: {item.available_qty}
                          {atMax && (
                            <span className="text-destructive ml-1">
                              (đã đạt tối đa)
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            updateQuantity(
                              item.product_variant_id,
                              item.quantity - 1
                            )
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={atMax}
                          onClick={() =>
                            updateQuantity(
                              item.product_variant_id,
                              item.quantity + 1
                            )
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeItem(item.product_variant_id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Totals & Payment */}
          <div className="border-t bg-card">
            <div className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tạm tính</span>
                <span>{formatVND(subTotal)}</span>
              </div>
              <div className="flex justify-between text-sm items-center gap-2">
                <span className="text-muted-foreground">Giảm giá (%)</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={discountValue}
                  onChange={(e) =>
                    setDiscount("percentage", Number(e.target.value))
                  }
                  className="w-20 h-7 text-right text-sm"
                />
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Tiết kiệm</span>
                  <span>-{formatVND(discountAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Tổng cộng</span>
                <span className="text-primary">{formatVND(totalAmount)}</span>
              </div>
            </div>

            {/* Payment button */}
            <div className="px-4 pb-4">
              <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="w-full h-12 text-base font-semibold"
                    size="lg"
                    disabled={items.length === 0}
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    Thanh toán — {formatVND(totalAmount)}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Phương thức thanh toán</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">
                        {formatVND(totalAmount)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {itemCount} sản phẩm
                      </p>
                    </div>
                    <Tabs
                      value={paymentMethod}
                      onValueChange={(v) =>
                        setPaymentMethod(v as "cash" | "card" | "transfer")
                      }
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="cash" className="gap-1">
                          <Banknote className="h-4 w-4" /> Tiền mặt
                        </TabsTrigger>
                        <TabsTrigger value="card" className="gap-1">
                          <CreditCard className="h-4 w-4" /> Thẻ
                        </TabsTrigger>
                        <TabsTrigger value="transfer" className="gap-1">
                          <Wallet className="h-4 w-4" /> Chuyển khoản
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="cash" className="mt-4 space-y-3">
                        <div>
                          <label className="text-sm font-medium">
                            Tiền khách đưa
                          </label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={cashReceived}
                            onChange={(e) => setCashReceived(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Tiền thừa</span>
                          <span className="font-medium">
                            {formatVND(change)}
                          </span>
                        </div>
                      </TabsContent>
                      <TabsContent value="card" className="mt-4">
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Quẹt thẻ trên máy POS để hoàn tất thanh toán
                        </p>
                      </TabsContent>
                      <TabsContent value="transfer" className="mt-4">
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Quét mã QR hoặc chuyển khoản ngân hàng
                        </p>
                      </TabsContent>
                    </Tabs>
                    <Button
                      className="w-full h-11"
                      onClick={handlePayment}
                      disabled={createOrderMutation.isPending}
                    >
                      {createOrderMutation.isPending
                        ? "Đang xử lý..."
                        : "Xác nhận thanh toán"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Variant selector dialog */}
      <Dialog
        open={!!variantDialogProduct}
        onOpenChange={(open) => !open && setVariantDialogProduct(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Chọn phiên bản — {variantDialogProduct?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {variantDialogProduct?.variants
              ?.filter((v) => v.is_active)
              .map((variant) => {
                const stock = variant.inventory?.available_qty ?? 0;
                const outOfStock = stock <= 0;
                return (
                  <button
                    key={variant.id}
                    disabled={outOfStock}
                    className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg border text-left transition-colors ${
                      outOfStock
                        ? "opacity-50 cursor-not-allowed bg-muted"
                        : "hover:border-primary hover:bg-primary/5 cursor-pointer"
                    }`}
                    onClick={() => {
                      if (!outOfStock && variantDialogProduct) {
                        addVariantToCart(variantDialogProduct, variant);
                        setVariantDialogProduct(null);
                      }
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{variant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        SKU: {variant.sku || "—"}
                        {variant.barcode
                          ? ` | Mã vạch: ${variant.barcode}`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-sm text-primary">
                        {formatVND(variant.selling_price)}
                      </p>
                      <Badge
                        variant={
                          outOfStock
                            ? "destructive"
                            : stock <= 5
                              ? "outline"
                              : "secondary"
                        }
                        className="text-xs"
                      >
                        Kho: {stock}
                      </Badge>
                    </div>
                  </button>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt printer dialog */}
      <ReceiptPrinter
        order={receiptOrder}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />

      {/* Close session dialog */}
      <Dialog open={closeSessionDialog} onOpenChange={setCloseSessionDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Đóng ca bán hàng</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              closeSessionMutation.mutate({
                closing_amount: closingAmount,
                notes: sessionNotes || undefined,
              });
            }}
            className="space-y-4"
          >
            {currentSession && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nhân viên</span>
                  <span className="font-medium">
                    {currentSession.user_name || "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Doanh thu ca</span>
                  <span className="font-medium">
                    {formatVND(currentSession.total_sales)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Số đơn hàng</span>
                  <span className="font-medium">
                    {currentSession.total_orders}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tiền đầu ca</span>
                  <span className="font-medium">
                    {formatVND(currentSession.opening_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">
                    Kỳ vọng cuối ca
                  </span>
                  <span className="font-bold">
                    {formatVND(
                      currentSession.opening_amount +
                        currentSession.total_sales
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
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Ghi chú đóng ca..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCloseSessionDialog(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={closeSessionMutation.isPending}
              >
                {closeSessionMutation.isPending ? "Đang đóng..." : "Đóng ca"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
