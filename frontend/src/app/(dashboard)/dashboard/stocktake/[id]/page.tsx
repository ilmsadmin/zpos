"use client";

import { use, useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Pencil,
  ScanBarcode,
  XCircle,
  FileText,
  Clock,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { stocktakeService } from "@/services/stocktake-service";
import { productService } from "@/services/product-service";
import { formatDateTime } from "@/lib/utils";
import axios from "axios";
import type { StocktakeItemResponse, ProductResponse } from "@/types/api";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ReactNode }> = {
  draft: { label: "Nháp", variant: "outline", icon: <FileText className="h-3 w-3" /> },
  in_progress: { label: "Đang kiểm", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  completed: { label: "Hoàn thành", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: "Đã hủy", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
};

export default function StocktakeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  // State
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedProductName, setSelectedProductName] = useState("");
  const [countedQty, setCountedQty] = useState(0);
  const [itemNotes, setItemNotes] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeQty, setBarcodeQty] = useState(1);
  const [editingItem, setEditingItem] = useState<StocktakeItemResponse | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [editNotes, setEditNotes] = useState("");
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "matched" | "mismatched">("all");

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: stocktake, isLoading } = useQuery({
    queryKey: ["stocktake", id],
    queryFn: () => stocktakeService.getById(id),
  });

  const { data: searchResults } = useQuery({
    queryKey: ["product-search-stocktake", productSearch],
    queryFn: () => productService.search(productSearch, 10),
    enabled: productSearch.length >= 2,
  });

  // Mutations
  const addItemMutation = useMutation({
    mutationFn: () =>
      stocktakeService.addItem(id, {
        product_variant_id: selectedVariantId,
        counted_qty: countedQty,
        notes: itemNotes || undefined,
      }),
    onSuccess: () => {
      toast.success("Đã thêm sản phẩm kiểm kê");
      queryClient.invalidateQueries({ queryKey: ["stocktake", id] });
      resetAddForm();
    },
    onError: (err: unknown) => {
      let msg = "Thêm sản phẩm thất bại";
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.error?.message || err.message || msg;
      }
      toast.error(msg);
    },
  });

  const addByBarcodeMutation = useMutation({
    mutationFn: ({ barcode, qty }: { barcode: string; qty: number }) =>
      stocktakeService.addItemByBarcode(id, { barcode, counted_qty: qty }),
    onSuccess: (result) => {
      toast.success(`Đã thêm: ${result.product_name} - ${result.variant_name} (SL: ${result.counted_qty})`);
      queryClient.invalidateQueries({ queryKey: ["stocktake", id] });
      setBarcodeInput("");
      setBarcodeQty(1);
      // Focus back to barcode input
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    },
    onError: (err: unknown) => {
      let msg = "Không tìm thấy sản phẩm với mã vạch này";
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.error?.message || msg;
      }
      toast.error(msg);
      setBarcodeInput("");
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: () => {
      if (!editingItem) throw new Error("No item selected");
      return stocktakeService.updateItem(id, editingItem.id, {
        counted_qty: editQty,
        notes: editNotes || "",
      });
    },
    onSuccess: () => {
      toast.success("Đã cập nhật số lượng");
      queryClient.invalidateQueries({ queryKey: ["stocktake", id] });
      setEditingItem(null);
    },
    onError: (err: unknown) => {
      let msg = "Cập nhật thất bại";
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.error?.message || err.message || msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      toast.error(msg);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => stocktakeService.deleteItem(id, itemId),
    onSuccess: () => {
      toast.success("Đã xóa sản phẩm khỏi phiên kiểm kê");
      queryClient.invalidateQueries({ queryKey: ["stocktake", id] });
      setDeleteItemId(null);
    },
    onError: (err: unknown) => {
      let msg = "Xóa thất bại";
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.error?.message || err.message || msg;
      }
      toast.error(msg);
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => stocktakeService.complete(id),
    onSuccess: () => {
      toast.success("Đã hoàn thành kiểm kê, tồn kho đã được cập nhật");
      queryClient.invalidateQueries({ queryKey: ["stocktake", id] });
      queryClient.invalidateQueries({ queryKey: ["stocktakes"] });
      setCompleteOpen(false);
    },
    onError: (err: Error) => toast.error(err.message || "Hoàn thành kiểm kê thất bại"),
  });

  const cancelMutation = useMutation({
    mutationFn: () => stocktakeService.cancel(id),
    onSuccess: () => {
      toast.success("Đã hủy phiên kiểm kê");
      queryClient.invalidateQueries({ queryKey: ["stocktake", id] });
      queryClient.invalidateQueries({ queryKey: ["stocktakes"] });
      setCancelOpen(false);
    },
    onError: (err: unknown) => {
      let msg = "Hủy phiên kiểm kê thất bại";
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.error?.message || err.message || msg;
      }
      toast.error(msg);
    },
  });

  // Helpers
  const resetAddForm = () => {
    setAddItemOpen(false);
    setProductSearch("");
    setSelectedVariantId("");
    setSelectedProductName("");
    setCountedQty(0);
    setItemNotes("");
  };

  const handleBarcodeSubmit = useCallback(() => {
    if (!barcodeInput.trim()) return;
    addByBarcodeMutation.mutate({ barcode: barcodeInput.trim(), qty: barcodeQty });
  }, [barcodeInput, barcodeQty, addByBarcodeMutation]);

  // Auto-focus barcode input when barcode mode is enabled
  useEffect(() => {
    if (barcodeMode) {
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    }
  }, [barcodeMode]);

  const isEditable = stocktake?.status === "draft" || stocktake?.status === "in_progress";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-60" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-60" />
      </div>
    );
  }

  if (!stocktake) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Không tìm thấy phiên kiểm kê</p>
        <Button variant="link" onClick={() => router.back()}>
          Quay lại
        </Button>
      </div>
    );
  }

  const st = statusConfig[stocktake.status] || { label: stocktake.status, variant: "secondary" as const, icon: null };
  const items = stocktake.items || [];

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filterMode === "matched") return item.difference === 0;
    if (filterMode === "mismatched") return item.difference !== 0;
    return true;
  });

  const matchedCount = items.filter((i) => i.difference === 0).length;
  const discrepancyCount = items.filter((i) => i.difference !== 0).length;
  const totalPositiveDiff = items.filter((i) => i.difference > 0).reduce((s, i) => s + i.difference, 0);
  const totalNegativeDiff = items.filter((i) => i.difference < 0).reduce((s, i) => s + i.difference, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Kiểm kê: ${stocktake.stocktake_number || stocktake.code}`}
        description={`Tạo lúc: ${formatDateTime(stocktake.created_at)}${stocktake.completed_at ? ` • Hoàn thành: ${formatDateTime(stocktake.completed_at)}` : ""}`}
      >
        <Button variant="outline" onClick={() => router.push("/dashboard/stocktake")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>
        {isEditable && (
          <>
            <Button
              variant={barcodeMode ? "default" : "outline"}
              onClick={() => setBarcodeMode(!barcodeMode)}
            >
              <ScanBarcode className="mr-2 h-4 w-4" />
              {barcodeMode ? "Tắt quét mã" : "Quét mã vạch"}
            </Button>
            <Button variant="outline" onClick={() => setAddItemOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Thêm sản phẩm
            </Button>
            {stocktake.status === "in_progress" && (
              <Button onClick={() => setCompleteOpen(true)}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Hoàn thành
              </Button>
            )}
            <Button variant="ghost" className="text-red-500" onClick={() => setCancelOpen(true)}>
              <XCircle className="mr-2 h-4 w-4" /> Hủy phiên
            </Button>
          </>
        )}
      </PageHeader>

      {/* Barcode scanner section */}
      {barcodeMode && isEditable && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ScanBarcode className="h-8 w-8 text-primary flex-shrink-0" />
              <div className="flex-1 flex gap-2">
                <div className="flex-1">
                  <Input
                    ref={barcodeInputRef}
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleBarcodeSubmit();
                      }
                    }}
                    placeholder="Quét hoặc nhập mã vạch..."
                    className="text-lg h-12"
                    autoFocus
                  />
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    value={barcodeQty}
                    onChange={(e) => setBarcodeQty(Number(e.target.value) || 1)}
                    min={0}
                    className="h-12 text-center"
                    placeholder="SL"
                  />
                </div>
                <Button
                  className="h-12 px-6"
                  onClick={handleBarcodeSubmit}
                  disabled={!barcodeInput.trim() || addByBarcodeMutation.isPending}
                >
                  {addByBarcodeMutation.isPending ? "Đang xử lý..." : "Thêm"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 ml-11">
              Quét mã vạch sản phẩm rồi nhấn Enter. Nếu sản phẩm đã có trong danh sách, số lượng sẽ được cập nhật.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Trạng thái</p>
            <Badge variant={st.variant} className="mt-2 gap-1">
              {st.icon}
              {st.label}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tổng SP kiểm</p>
            <p className="text-2xl font-bold mt-1">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Khớp</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{matchedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Chênh lệch</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{discrepancyCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Thừa / Thiếu</p>
            <div className="flex gap-2 mt-1">
              <span className="text-lg font-bold text-blue-600">+{totalPositiveDiff}</span>
              <span className="text-lg font-bold text-red-600">{totalNegativeDiff}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {stocktake.notes && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Ghi chú</p>
            <p className="mt-1">{stocktake.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Items table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" /> Chi tiết kiểm kê ({filteredItems.length})
            </CardTitle>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={filterMode === "all" ? "default" : "outline"}
                onClick={() => setFilterMode("all")}
              >
                Tất cả ({items.length})
              </Button>
              <Button
                size="sm"
                variant={filterMode === "matched" ? "default" : "outline"}
                onClick={() => setFilterMode("matched")}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" /> Khớp ({matchedCount})
              </Button>
              <Button
                size="sm"
                variant={filterMode === "mismatched" ? "default" : "outline"}
                onClick={() => setFilterMode("mismatched")}
              >
                <AlertTriangle className="h-3 w-3 mr-1" /> Lệch ({discrepancyCount})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">
                Chưa có sản phẩm nào trong phiên kiểm kê.
              </p>
              {isEditable && (
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => setBarcodeMode(true)}>
                    <ScanBarcode className="mr-2 h-4 w-4" /> Quét mã vạch
                  </Button>
                  <Button onClick={() => setAddItemOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Thêm sản phẩm
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 font-medium">#</th>
                    <th className="text-left p-3 font-medium">Sản phẩm</th>
                    <th className="text-left p-3 font-medium">SKU / Barcode</th>
                    <th className="text-right p-3 font-medium">Hệ thống</th>
                    <th className="text-right p-3 font-medium">Thực tế</th>
                    <th className="text-right p-3 font-medium">Chênh lệch</th>
                    <th className="text-center p-3 font-medium">Trạng thái</th>
                    {isEditable && <th className="text-center p-3 font-medium w-[100px]">Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, idx) => (
                    <tr key={item.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-muted-foreground">{idx + 1}</td>
                      <td className="p-3">
                        <p className="font-medium">{item.product_name || "N/A"}</p>
                        <p className="text-xs text-muted-foreground">{item.variant_name || ""}</p>
                        {item.notes && (
                          <p className="text-xs text-blue-500 mt-0.5">📝 {item.notes}</p>
                        )}
                      </td>
                      <td className="p-3">
                        <p className="font-mono text-xs">{item.sku || "-"}</p>
                        {item.barcode && (
                          <p className="font-mono text-xs text-muted-foreground">{item.barcode}</p>
                        )}
                      </td>
                      <td className="p-3 text-right tabular-nums">{item.system_qty}</td>
                      <td className="p-3 text-right font-semibold tabular-nums">{item.counted_qty}</td>
                      <td className="p-3 text-right tabular-nums">
                        <span
                          className={
                            item.difference === 0
                              ? "text-green-600"
                              : item.difference > 0
                              ? "text-blue-600 font-semibold"
                              : "text-red-600 font-semibold"
                          }
                        >
                          {item.difference > 0 ? "+" : ""}
                          {item.difference}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {item.difference === 0 ? (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Khớp
                          </Badge>
                        ) : item.difference > 0 ? (
                          <Badge variant="secondary" className="text-xs text-blue-700">
                            Thừa +{item.difference}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Thiếu {item.difference}
                          </Badge>
                        )}
                      </td>
                      {isEditable && (
                        <td className="p-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingItem(item);
                                setEditQty(item.counted_qty);
                                setEditNotes(item.notes || "");
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => setDeleteItemId(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                {discrepancyCount > 0 && filterMode !== "matched" && (
                  <tfoot>
                    <tr className="border-t bg-muted/30">
                      <td colSpan={isEditable ? 4 : 3} />
                      <td className="p-3 text-right font-medium text-sm">Tổng:</td>
                      <td className="p-3 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          {totalPositiveDiff > 0 && (
                            <span className="text-blue-600 font-semibold">+{totalPositiveDiff}</span>
                          )}
                          {totalNegativeDiff < 0 && (
                            <span className="text-red-600 font-semibold">{totalNegativeDiff}</span>
                          )}
                        </div>
                      </td>
                      <td colSpan={isEditable ? 2 : 1} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add item dialog */}
      <Dialog open={addItemOpen} onOpenChange={(open) => { if (!open) resetAddForm(); else setAddItemOpen(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Thêm sản phẩm kiểm kê</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tìm sản phẩm</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setSelectedVariantId("");
                    setSelectedProductName("");
                  }}
                  placeholder="Nhập tên sản phẩm, SKU hoặc barcode..."
                  className="pl-9"
                  autoFocus
                />
              </div>
              {searchResults && searchResults.length > 0 && !selectedVariantId && (
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {searchResults.flatMap((p: ProductResponse) =>
                    (p.variants || []).map((v) => (
                      <button
                        key={v.id}
                        className="w-full text-left p-3 text-sm hover:bg-muted/50 border-b last:border-b-0 transition-colors"
                        onClick={() => {
                          setSelectedVariantId(v.id);
                          setSelectedProductName(`${p.name} - ${v.name}`);
                        }}
                      >
                        <p className="font-medium">
                          {p.name} - {v.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          SKU: {v.sku} {v.barcode ? `| Barcode: ${v.barcode}` : ""} | Tồn kho: {v.inventory?.quantity ?? 0}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
              {selectedVariantId && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">✓ Đã chọn</p>
                      <p className="text-sm">{selectedProductName}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedVariantId("");
                        setSelectedProductName("");
                      }}
                    >
                      Đổi
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Số lượng thực tế <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  value={countedQty || ""}
                  onChange={(e) => setCountedQty(Number(e.target.value))}
                  min={0}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Input
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="Ghi chú (tùy chọn)"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetAddForm}>
                Hủy
              </Button>
              <Button
                onClick={() => addItemMutation.mutate()}
                disabled={!selectedVariantId || addItemMutation.isPending}
              >
                {addItemMutation.isPending ? "Đang thêm..." : "Thêm sản phẩm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit item dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => { if (!open) setEditingItem(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cập nhật số lượng</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium">{editingItem.product_name}</p>
                <p className="text-sm text-muted-foreground">{editingItem.variant_name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  SKU: {editingItem.sku} | Tồn kho hệ thống: {editingItem.system_qty}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Số lượng thực tế</Label>
                <Input
                  type="number"
                  value={editQty}
                  onChange={(e) => setEditQty(Number(e.target.value) || 0)}
                  min={0}
                  autoFocus
                />
                {editQty !== editingItem.system_qty && (
                  <p className="text-xs">
                    Chênh lệch:{" "}
                    <span className={editQty - editingItem.system_qty > 0 ? "text-blue-600 font-medium" : "text-red-600 font-medium"}>
                      {editQty - editingItem.system_qty > 0 ? "+" : ""}
                      {editQty - editingItem.system_qty}
                    </span>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ghi chú (tùy chọn)"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingItem(null)}>
                  Hủy
                </Button>
                <Button
                  onClick={() => updateItemMutation.mutate()}
                  disabled={updateItemMutation.isPending}
                >
                  {updateItemMutation.isPending ? "Đang lưu..." : "Lưu"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete item confirmation */}
      <ConfirmDialog
        open={!!deleteItemId}
        onOpenChange={() => setDeleteItemId(null)}
        title="Xóa sản phẩm"
        description="Xác nhận xóa sản phẩm này khỏi phiên kiểm kê?"
        confirmLabel="Xóa"
        variant="destructive"
        onConfirm={() => deleteItemId && deleteItemMutation.mutate(deleteItemId)}
        isLoading={deleteItemMutation.isPending}
      />

      {/* Complete confirmation */}
      <ConfirmDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title="Hoàn thành kiểm kê"
        description={`Xác nhận hoàn thành phiên kiểm kê ${stocktake.stocktake_number || stocktake.code}?

• ${items.length} sản phẩm đã kiểm
• ${matchedCount} sản phẩm khớp
• ${discrepancyCount} sản phẩm chênh lệch

Tồn kho sẽ được tự động cập nhật theo kết quả kiểm đếm. Hành động không thể hoàn tác.`}
        confirmLabel="Hoàn thành kiểm kê"
        onConfirm={() => completeMutation.mutate()}
        isLoading={completeMutation.isPending}
      />

      {/* Cancel confirmation */}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Hủy phiên kiểm kê"
        description="Xác nhận hủy phiên kiểm kê này? Dữ liệu kiểm đếm sẽ không được áp dụng vào tồn kho."
        confirmLabel="Hủy phiên"
        variant="destructive"
        onConfirm={() => cancelMutation.mutate()}
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
