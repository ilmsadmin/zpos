"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { productService } from "@/services/product-service";
import { categoryService } from "@/services/category-service";
import { formatVND } from "@/lib/utils";
import type {
  CreateProductRequest,
  CreateVariantRequest,
  CategoryResponse,
  ErrorResponse,
} from "@/types/api";

const STEPS = [
  { label: "Thông tin cơ bản", key: "basic" },
  { label: "Biến thể & Giá", key: "variants" },
  { label: "Xác nhận", key: "confirm" },
];

function flattenCategories(cats: CategoryResponse[]): CategoryResponse[] {
  const result: CategoryResponse[] = [];
  function walk(list: CategoryResponse[], level: number) {
    for (const c of list) {
      result.push({ ...c, name: "—".repeat(level) + " " + c.name });
      if (c.children?.length) walk(c.children, level + 1);
    }
  }
  walk(cats, 0);
  return result;
}

const emptyVariant: CreateVariantRequest = {
  name: "Mặc định",
  sku: undefined,
  barcode: undefined,
  cost_price: 0,
  selling_price: 0,
  compare_at_price: undefined,
  weight: undefined,
  initial_stock: 0,
};

export default function CreateProductPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Basic info
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState("cái");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  // Variants
  const [variants, setVariants] = useState<CreateVariantRequest[]>([
    { ...emptyVariant },
  ]);

  const { data: categories } = useQuery({
    queryKey: ["categories-tree"],
    queryFn: () => categoryService.getTree(),
  });

  const flatCats = categories ? flattenCategories(categories) : [];

  const createMutation = useMutation({
    mutationFn: (data: CreateProductRequest) => productService.create(data),
    onSuccess: () => {
      toast.success("Đã tạo sản phẩm thành công");
      router.push("/dashboard/products");
    },
    onError: (error: unknown) => {
      console.error("Create product error:", error);
      const err = error as { response?: { data?: ErrorResponse } };
      const errBody = err?.response?.data?.error;
      const msg = errBody?.details?.map((e: { field: string; message: string }) => `${e.field}: ${e.message}`).join(", ") || errBody?.message || "Tạo sản phẩm thất bại";
      toast.error(msg);
    },
  });

  const updateVariant = (idx: number, patch: Partial<CreateVariantRequest>) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, ...patch } : v))
    );
  };

  const removeVariant = (idx: number) => {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        ...emptyVariant,
        name: `Biến thể ${prev.length + 1}`,
      },
    ]);
  };

  const canNext = () => {
    if (step === 0) return name.trim() !== "" && categoryId !== "";
    if (step === 1) return variants.every((v) => v.name.trim() && v.selling_price > 0);
    return true;
  };

  const handleSubmit = () => {
    const payload: CreateProductRequest = {
      name,
      category_id: categoryId,
      brand: brand || undefined,
      unit,
      description: description || undefined,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      variants: variants.map((v) => ({
        name: v.name,
        sku: v.sku || undefined,
        barcode: v.barcode || undefined,
        cost_price: v.cost_price,
        selling_price: v.selling_price,
        compare_at_price: v.compare_at_price || undefined,
        weight: v.weight || undefined,
        initial_stock: v.initial_stock || 0,
      })),
    };
    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Thêm sản phẩm mới" description="Tạo sản phẩm và biến thể">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>
      </PageHeader>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`text-sm ${
                i <= step ? "font-medium" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`w-12 h-0.5 ${i < step ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Basic info */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Thông tin cơ bản</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Tên sản phẩm *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="iPhone 15 Pro Max"
                />
              </div>
              <div className="space-y-2">
                <Label>Danh mục *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    {flatCats.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Thương hiệu</Label>
                <Input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Apple"
                />
              </div>
              <div className="space-y-2">
                <Label>Đơn vị tính</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cái">Cái</SelectItem>
                    <SelectItem value="chiếc">Chiếc</SelectItem>
                    <SelectItem value="bộ">Bộ</SelectItem>
                    <SelectItem value="hộp">Hộp</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="m">Mét</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tags (phân cách bằng dấu phẩy)</Label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="hot, bestseller, new"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Mô tả</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả chi tiết sản phẩm..."
                  rows={4}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Variants */}
      {step === 1 && (
        <div className="space-y-4">
          {variants.map((v, idx) => (
            <Card key={idx}>
              <CardHeader className="flex-row items-center justify-between py-3">
                <CardTitle className="text-base">
                  Biến thể {idx + 1}: {v.name || "—"}
                </CardTitle>
                {variants.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeVariant(idx)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Tên biến thể *</Label>
                    <Input
                      value={v.name}
                      onChange={(e) => updateVariant(idx, { name: e.target.value })}
                      placeholder="256GB - Đen"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SKU</Label>
                    <Input
                      value={v.sku || ""}
                      onChange={(e) => updateVariant(idx, { sku: e.target.value })}
                      placeholder="IP15PM-256-BK"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mã vạch</Label>
                    <Input
                      value={v.barcode || ""}
                      onChange={(e) => updateVariant(idx, { barcode: e.target.value })}
                      placeholder="8901234567890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Giá nhập</Label>
                    <Input
                      type="number"
                      value={v.cost_price || ""}
                      onChange={(e) =>
                        updateVariant(idx, { cost_price: Number(e.target.value) })
                      }
                      placeholder="25000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Giá bán *</Label>
                    <Input
                      type="number"
                      value={v.selling_price || ""}
                      onChange={(e) =>
                        updateVariant(idx, { selling_price: Number(e.target.value) })
                      }
                      placeholder="30000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Giá so sánh</Label>
                    <Input
                      type="number"
                      value={v.compare_at_price || ""}
                      onChange={(e) =>
                        updateVariant(idx, {
                          compare_at_price: Number(e.target.value) || undefined,
                        })
                      }
                      placeholder="32000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Trọng lượng (g)</Label>
                    <Input
                      type="number"
                      value={v.weight || ""}
                      onChange={(e) =>
                        updateVariant(idx, { weight: Number(e.target.value) || undefined })
                      }
                      placeholder="221"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tồn kho ban đầu</Label>
                    <Input
                      type="number"
                      value={v.initial_stock || ""}
                      onChange={(e) =>
                        updateVariant(idx, {
                          initial_stock: Number(e.target.value) || 0,
                        })
                      }
                      placeholder="50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" onClick={addVariant} className="w-full">
            <Plus className="mr-2 h-4 w-4" /> Thêm biến thể
          </Button>
        </div>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Xác nhận thông tin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Tên sản phẩm</p>
                <p className="font-medium">{name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Danh mục</p>
                <p className="font-medium">
                  {flatCats.find((c) => c.id === categoryId)?.name || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Thương hiệu</p>
                <p className="font-medium">{brand || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đơn vị</p>
                <p className="font-medium">{unit}</p>
              </div>
              {tags && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {tags.split(",").map((t, i) => (
                      <Badge key={i} variant="secondary">
                        {t.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {description && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Mô tả</p>
                  <p className="text-sm">{description}</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-3">Biến thể ({variants.length})</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-3 font-medium">Tên</th>
                      <th className="text-left p-3 font-medium">SKU</th>
                      <th className="text-right p-3 font-medium">Giá nhập</th>
                      <th className="text-right p-3 font-medium">Giá bán</th>
                      <th className="text-right p-3 font-medium">Tồn kho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-3 font-medium">{v.name}</td>
                        <td className="p-3 font-mono">{v.sku || "—"}</td>
                        <td className="p-3 text-right">{formatVND(v.cost_price)}</td>
                        <td className="p-3 text-right font-medium">
                          {formatVND(v.selling_price)}
                        </td>
                        <td className="p-3 text-right">{v.initial_stock || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
            Tiếp theo <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Đang tạo..." : "Tạo sản phẩm"}
          </Button>
        )}
      </div>
    </div>
  );
}
