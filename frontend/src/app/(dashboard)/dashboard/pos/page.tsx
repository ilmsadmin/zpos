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
} from "lucide-react";
import { toast } from "sonner";
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
import { posSessionService, type OpenPOSSessionRequest, type ClosePOSSessionRequest } from "@/services/pos-session-service";
import { usePOSStore, type CartItem } from "@/stores/pos-store";
import { ReceiptPrinter } from "@/components/receipt-printer";
import { formatVND, formatDateTime } from "@/lib/utils";
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
  return cats; // already top-level from the tree API
}

export default function POSPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "card" | "transfer"
  >("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);

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

  // Fetch products — pass category_id to backend which now resolves children
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
      // Show receipt
      setReceiptOrder(order);
      setReceiptOpen(true);
    },
    onError: () => toast.error("Tạo đơn hàng thất bại"),
  });

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
        // Single variant → add directly
        const variant = activeVariants[0];
        const stock = variant.inventory?.available_qty ?? 0;
        if (stock <= 0) {
          toast.error("Sản phẩm đã hết hàng");
          return;
        }
        addVariantToCart(product, variant);
      } else {
        // Multiple variants → open selector dialog
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
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
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
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Chưa mở ca bán hàng</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Bạn cần mở ca trước khi sử dụng POS. Vui lòng nhập tiền đầu ca và mở ca để bắt đầu bán hàng.
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
              <Button type="submit" className="w-full h-12 text-base" disabled={openSessionMutation.isPending}>
                <Play className="mr-2 h-5 w-5" />
                {openSessionMutation.isPending ? "Đang mở ca..." : "Mở ca bán hàng"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      {/* Session info bar */}
      <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
        <div className="flex items-center gap-4">
          <Badge variant="default" className="gap-1">
            <Clock className="h-3 w-3" /> Ca đang mở
          </Badge>
          <span className="text-sm text-muted-foreground">
            NV: <span className="font-medium text-foreground">{currentSession.user_name || "—"}</span>
          </span>
          <span className="text-sm text-muted-foreground">
            Mở lúc: <span className="font-medium text-foreground">{formatDateTime(currentSession.opened_at)}</span>
          </span>
          <span className="text-sm text-muted-foreground">
            <DollarSign className="h-3 w-3 inline" /> Doanh thu: <span className="font-bold text-primary">{formatVND(currentSession.total_sales)}</span>
          </span>
          <span className="text-sm text-muted-foreground">
            <ShoppingBag className="h-3 w-3 inline" /> Đơn: <span className="font-bold">{currentSession.total_orders}</span>
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCloseSessionDialog(true)}>
          <Square className="mr-1 h-3 w-3" /> Đóng ca
        </Button>
      </div>

      {/* Main POS layout */}
      <div className="flex gap-4 flex-1 min-h-0">
      {/* Left: Product grid */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm sản phẩm hoặc quét mã vạch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon">
            <QrCode className="h-4 w-4" />
          </Button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
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
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
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
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">Không tìm thấy sản phẩm</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {products.map((product) => {
                const activeVariants = (product.variants || []).filter(
                  (v) => v.is_active
                );
                const totalStock = activeVariants.reduce(
                  (sum, v) => sum + (v.inventory?.available_qty ?? 0),
                  0
                );
                const hasMultipleVariants = activeVariants.length > 1;
                // Price range for display
                const prices = activeVariants.map((v) => v.selling_price);
                const minPrice = Math.min(...(prices.length ? prices : [0]));
                const maxPrice = Math.max(...(prices.length ? prices : [0]));
                const outOfStock = totalStock <= 0;

                return (
                  <Card
                    key={product.id}
                    className={`cursor-pointer hover:border-primary/50 transition-colors ${outOfStock ? "opacity-50" : ""}`}
                    onClick={() => !outOfStock && handleProductClick(product)}
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

      {/* Right: Cart */}
      <Card className="w-96 flex flex-col flex-shrink-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Giỏ hàng</CardTitle>
            <Badge variant="secondary">{itemCount} sản phẩm</Badge>
          </div>
          {/* Customer selector */}
          <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2 mt-2">
                <User className="h-4 w-4" />
                {customer ? customer.full_name : "Chọn khách hàng"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Chọn khách hàng</DialogTitle>
              </DialogHeader>
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
                        <p className="text-xs text-muted-foreground">{c.phone}</p>
                      </div>
                    </Button>
                  ))}
                  {customerSearch.length >= 2 && !customerResults?.length && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Không tìm thấy
                    </p>
                  )}
                </div>
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
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <Separator />

        {/* Cart items */}
        <ScrollArea className="flex-1 px-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">Giỏ hàng trống</p>
              <p className="text-xs mt-1">Chọn sản phẩm để thêm vào giỏ</p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {items.map((item) => {
                const atMax = item.available_qty > 0 && item.quantity >= item.available_qty;
                return (
                <div key={item.product_variant_id} className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product_name}</p>
                    {item.variant_name && item.variant_name !== "Default" && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.variant_name}
                      </p>
                    )}
                    <p className="text-xs text-primary font-medium">
                      {formatVND(item.unit_price)} × {item.quantity} ={" "}
                      {formatVND(item.unit_price * item.quantity)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Kho: {item.available_qty}{atMax && <span className="text-destructive ml-1">(đã đạt tối đa)</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.product_variant_id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={atMax}
                      onClick={() => updateQuantity(item.product_variant_id, item.quantity + 1)}
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

        <Separator />

        {/* Totals */}
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
              onChange={(e) => setDiscount("percentage", Number(e.target.value))}
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

        {/* Payment */}
        <div className="p-4 pt-0">
          <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
            <DialogTrigger asChild>
              <Button className="w-full h-12 text-base" disabled={items.length === 0}>
                <CreditCard className="mr-2 h-5 w-5" />
                Thanh toán
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Phương thức thanh toán</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{formatVND(totalAmount)}</p>
                  <p className="text-sm text-muted-foreground mt-1">{itemCount} sản phẩm</p>
                </div>
                <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "cash" | "card" | "transfer")} className="w-full">
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
                      <label className="text-sm font-medium">Tiền khách đưa</label>
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
                      <span className="font-medium">{formatVND(change)}</span>
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
                  className="w-full"
                  onClick={handlePayment}
                  disabled={createOrderMutation.isPending}
                >
                  {createOrderMutation.isPending ? "Đang xử lý..." : "Xác nhận thanh toán"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

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
                        {variant.barcode ? ` | Mã vạch: ${variant.barcode}` : ""}
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
      </div>

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
                  <span className="font-medium">{currentSession.user_name || "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Doanh thu ca</span>
                  <span className="font-medium">{formatVND(currentSession.total_sales)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Số đơn hàng</span>
                  <span className="font-medium">{currentSession.total_orders}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tiền đầu ca</span>
                  <span className="font-medium">{formatVND(currentSession.opening_amount)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">Kỳ vọng cuối ca</span>
                  <span className="font-bold">
                    {formatVND(
                      currentSession.opening_amount + currentSession.total_sales
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
              <Button type="button" variant="outline" onClick={() => setCloseSessionDialog(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="destructive" disabled={closeSessionMutation.isPending}>
                {closeSessionMutation.isPending ? "Đang đóng..." : "Đóng ca"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
