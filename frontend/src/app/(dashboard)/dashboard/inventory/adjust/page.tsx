"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { inventoryService, type BulkAdjustInventoryRequest } from "@/services/inventory-service";
import { productService } from "@/services/product-service";
import type { AdjustInventoryRequest, ProductResponse } from "@/types/api";

interface AdjustItem extends AdjustInventoryRequest {
  productName: string;
  variantName: string;
  currentQty: number;
}

export default function StockAdjustPage() {
  const router = useRouter();
  const [items, setItems] = useState<AdjustItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: searchResults } = useQuery({
    queryKey: ["product-search-adjust", searchTerm],
    queryFn: () => productService.search(searchTerm, 10),
    enabled: searchTerm.length >= 2,
  });

  const bulkMutation = useMutation({
    mutationFn: (data: BulkAdjustInventoryRequest) =>
      inventoryService.bulkAdjust(data),
    onSuccess: () => {
      toast.success("Đã điều chỉnh tồn kho thành công");
      router.push("/dashboard/inventory");
    },
    onError: () => toast.error("Điều chỉnh tồn kho thất bại"),
  });

  const addItem = (product: ProductResponse, variantId: string) => {
    if (items.find((i) => i.product_variant_id === variantId)) {
      toast.error("Sản phẩm đã được thêm");
      return;
    }
    const variant = product.variants?.find((v) => v.id === variantId);
    if (!variant) return;

    setItems((prev) => [
      ...prev,
      {
        product_variant_id: variantId,
        productName: product.name,
        variantName: variant.name,
        currentQty: variant.inventory?.quantity ?? 0,
        quantity: 0,
        type: "adjustment",
        reason: "",
        notes: "",
      },
    ]);
    setSearchTerm("");
  };

  const updateItem = (idx: number, patch: Partial<AdjustItem>) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    const validItems = items.filter((i) => i.quantity !== 0 && i.reason.trim());
    if (validItems.length === 0) {
      toast.error("Vui lòng thêm ít nhất 1 sản phẩm với số lượng và lý do");
      return;
    }
    bulkMutation.mutate({
      items: validItems.map((i) => ({
        product_variant_id: i.product_variant_id,
        quantity: i.quantity,
        type: i.type,
        reason: i.reason,
        notes: i.notes,
      })),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Điều chỉnh tồn kho"
        description="Điều chỉnh số lượng tồn kho hàng loạt"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>
      </PageHeader>

      {/* Search and add products */}
      <Card>
        <CardHeader>
          <CardTitle>Thêm sản phẩm</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm sản phẩm theo tên, SKU..."
              className="pl-9"
            />
          </div>
          {searchResults && searchResults.length > 0 && searchTerm.length >= 2 && (
            <div className="border rounded-lg mt-2 max-h-64 overflow-y-auto">
              {searchResults.flatMap((p: ProductResponse) =>
                (p.variants || []).map((v) => (
                  <button
                    key={v.id}
                    className="w-full text-left p-3 text-sm hover:bg-muted/50 border-b last:border-b-0 flex items-center justify-between"
                    onClick={() => addItem(p, v.id)}
                  >
                    <div>
                      <p className="font-medium">
                        {p.name} - {v.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        SKU: {v.sku} | Tồn: {v.inventory?.quantity ?? 0}
                      </p>
                    </div>
                    <Plus className="h-4 w-4 text-primary" />
                  </button>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items to adjust */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sản phẩm điều chỉnh ({items.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, idx) => (
              <div key={item.product_variant_id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">{item.variantName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tồn hiện tại: <strong>{item.currentQty}</strong>
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(idx)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Loại</Label>
                    <Select
                      value={item.type}
                      onValueChange={(v) =>
                        updateItem(idx, { type: v as "in" | "out" | "adjustment" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in">Nhập kho (+)</SelectItem>
                        <SelectItem value="out">Xuất kho (-)</SelectItem>
                        <SelectItem value="adjustment">Điều chỉnh</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Số lượng *</Label>
                    <Input
                      type="number"
                      value={item.quantity || ""}
                      onChange={(e) =>
                        updateItem(idx, { quantity: Number(e.target.value) })
                      }
                      placeholder="Nhập số lượng"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Lý do *</Label>
                    <Input
                      value={item.reason}
                      onChange={(e) => updateItem(idx, { reason: e.target.value })}
                      placeholder="Lý do điều chỉnh"
                    />
                  </div>
                </div>
                {item.quantity !== 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Sau điều chỉnh:{" "}
                    <strong>
                      {item.type === "out"
                        ? item.currentQty - Math.abs(item.quantity)
                        : item.currentQty + Math.abs(item.quantity)}
                    </strong>
                  </p>
                )}
              </div>
            ))}

            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={bulkMutation.isPending}>
                {bulkMutation.isPending ? "Đang xử lý..." : "Xác nhận điều chỉnh"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
