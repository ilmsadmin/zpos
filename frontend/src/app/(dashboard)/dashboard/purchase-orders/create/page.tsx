"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { purchaseOrderService } from "@/services/purchase-order-service";
import { supplierService } from "@/services/supplier-service";
import { productService } from "@/services/product-service";
import { formatVND } from "@/lib/utils";
import type { VariantResponse, ProductResponse } from "@/types/api";

interface POItem {
  product_variant_id: string;
  product_name: string;
  variant_name: string;
  sku: string;
  quantity: number;
  unit_cost: number;
}

export default function CreatePurchaseOrderPage() {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<POItem[]>([]);
  const [productSearch, setProductSearch] = useState("");

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: () => supplierService.list({ page: 1, limit: 100 }),
  });

  const { data: productResults } = useQuery({
    queryKey: ["product-search-po", productSearch],
    queryFn: () => productService.search(productSearch, 20),
    enabled: productSearch.length >= 2,
  });

  const createMutation = useMutation({
    mutationFn: purchaseOrderService.create,
    onSuccess: () => {
      toast.success("Đã tạo phiếu nhập hàng");
      router.push("/dashboard/purchase-orders");
    },
    onError: () => toast.error("Không thể tạo phiếu nhập hàng"),
  });

  const addProduct = (product: ProductResponse, variant: VariantResponse) => {
    const existing = items.find((i) => i.product_variant_id === variant.id);
    if (existing) {
      setItems(
        items.map((i) =>
          i.product_variant_id === variant.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      );
    } else {
      setItems([
        ...items,
        {
          product_variant_id: variant.id,
          product_name: product.name,
          variant_name: variant.name,
          sku: variant.sku,
          quantity: 1,
          unit_cost: variant.cost_price,
        },
      ]);
    }
    setProductSearch("");
  };

  const updateItem = (index: number, field: "quantity" | "unit_cost", value: number) => {
    setItems(
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);

  const handleSubmit = () => {
    if (!supplierId) {
      toast.error("Vui lòng chọn nhà cung cấp");
      return;
    }
    if (items.length === 0) {
      toast.error("Vui lòng thêm ít nhất 1 sản phẩm");
      return;
    }
    createMutation.mutate({
      supplier_id: supplierId,
      notes,
      items: items.map((item) => ({
        product_variant_id: item.product_variant_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
      })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Tạo phiếu nhập hàng</h1>
          <p className="text-sm text-muted-foreground">
            Tạo phiếu đặt hàng từ nhà cung cấp
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Product Search & Add */}
          <Card>
            <CardHeader>
              <CardTitle>Sản phẩm nhập</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm sản phẩm theo tên, SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9"
                />
                {productResults && productResults.length > 0 && productSearch.length >= 2 && (
                  <div className="absolute z-10 mt-1 w-full bg-popover border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {productResults.map((product) =>
                      product.variants?.map((variant) => (
                        <button
                          key={variant.id}
                          className="w-full px-4 py-2.5 text-left hover:bg-accent flex items-center justify-between text-sm"
                          onClick={() => addProduct(product, variant)}
                        >
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {variant.name} • {variant.sku}
                            </p>
                          </div>
                          <span className="font-mono text-muted-foreground">
                            {formatVND(variant.cost_price)}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead className="w-24">Số lượng</TableHead>
                      <TableHead className="w-36">Giá nhập</TableHead>
                      <TableHead className="text-right w-32">Thành tiền</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={item.product_variant_id}>
                        <TableCell>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.variant_name} • {item.sku}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(index, "quantity", parseInt(e.target.value) || 1)
                            }
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={item.unit_cost}
                            onChange={(e) =>
                              updateItem(index, "unit_cost", parseFloat(e.target.value) || 0)
                            }
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatVND(item.quantity * item.unit_cost)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Tìm kiếm và thêm sản phẩm cần nhập</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin phiếu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nhà cung cấp *</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn nhà cung cấp" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.data?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú cho phiếu nhập..."
                />
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tổng sản phẩm</span>
                  <span>{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tổng số lượng</span>
                  <span>{items.reduce((s, i) => s + i.quantity, 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Tổng tiền</span>
                  <span className="text-primary">{formatVND(totalAmount)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Đang tạo..." : "Tạo phiếu nhập"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
