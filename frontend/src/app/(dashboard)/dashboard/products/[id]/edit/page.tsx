"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { productService } from "@/services/product-service";
import { categoryService } from "@/services/category-service";
import type {
  UpdateProductRequest,
  CreateVariantRequest,
  UpdateVariantRequest,
  CategoryResponse,
  ErrorResponse,
} from "@/types/api";

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

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState("cái");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Variant dialog state
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [newVariant, setNewVariant] = useState<CreateVariantRequest>({
    name: "",
    sku: "",
    barcode: "",
    cost_price: 0,
    selling_price: 0,
    initial_stock: 0,
  });

  // Inline edit state for existing variants
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editVariantData, setEditVariantData] = useState<UpdateVariantRequest>({});

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => productService.getById(id),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-tree"],
    queryFn: () => categoryService.getTree(),
  });

  const flatCats = categories ? flattenCategories(categories) : [];

  useEffect(() => {
    if (product) {
      setName(product.name);
      setCategoryId(product.category_id || product.category?.id || "");
      setBrand(product.brand || "");
      setUnit(product.unit || "cái");
      setDescription(product.description || "");
      setTags(product.tags?.join(", ") || "");
      setIsActive(product.is_active);
    }
  }, [product]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProductRequest) => productService.update(id, data),
    onSuccess: () => {
      toast.success("Đã cập nhật sản phẩm");
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      router.push(`/dashboard/products/${id}`);
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: ErrorResponse } })?.response?.data?.error?.message;
      toast.error(msg || "Cập nhật thất bại");
    },
  });

  const updateVariantMutation = useMutation({
    mutationFn: ({ variantId, data }: { variantId: string; data: UpdateVariantRequest }) =>
      productService.updateVariant(id, variantId, data),
    onSuccess: () => {
      toast.success("Đã cập nhật biến thể");
      setEditingVariantId(null);
      queryClient.invalidateQueries({ queryKey: ["product", id] });
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: ErrorResponse } })?.response?.data?.error?.message;
      toast.error(msg || "Cập nhật biến thể thất bại");
    },
  });

  const addVariantMutation = useMutation({
    mutationFn: (data: CreateVariantRequest) => productService.createVariant(id, data),
    onSuccess: () => {
      toast.success("Đã thêm biến thể");
      setVariantDialogOpen(false);
      setNewVariant({ name: "", sku: "", barcode: "", cost_price: 0, selling_price: 0, initial_stock: 0 });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: ErrorResponse } })?.response?.data?.error?.message;
      toast.error(msg || "Thêm biến thể thất bại");
    },
  });

  const deleteVariantMutation = useMutation({
    mutationFn: (variantId: string) => productService.deleteVariant(id, variantId),
    onSuccess: () => {
      toast.success("Đã xóa biến thể");
      queryClient.invalidateQueries({ queryKey: ["product", id] });
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: ErrorResponse } })?.response?.data?.error?.message;
      toast.error(msg || "Xóa biến thể thất bại");
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      name,
      category_id: categoryId || undefined,
      brand: brand || undefined,
      unit,
      description: description || undefined,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      is_active: isActive,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-60" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Không tìm thấy sản phẩm</p>
        <Button variant="link" onClick={() => router.back()}>
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Chỉnh sửa: ${product.name}`}
        description="Cập nhật thông tin sản phẩm"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin cơ bản</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Tên sản phẩm</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Danh mục</Label>
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
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
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
              <Input value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Mô tả</Label>
              <Textarea
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>{isActive ? "Đang bán" : "Ngừng bán"}</Label>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Variants section */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Biến thể ({product.variants?.length || 0})</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setNewVariant({
                name: `Biến thể ${(product.variants?.length || 0) + 1}`,
                sku: "",
                barcode: "",
                cost_price: 0,
                selling_price: 0,
                initial_stock: 0,
              });
              setVariantDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Thêm biến thể
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {product.variants?.map((v) => (
            <div key={v.id} className="border rounded-lg p-4">
              {editingVariantId === v.id ? (
                /* Inline editing mode */
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-primary">Đang chỉnh sửa</h4>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={updateVariantMutation.isPending}
                        onClick={() => {
                          updateVariantMutation.mutate({
                            variantId: v.id,
                            data: editVariantData,
                          });
                        }}
                      >
                        <Save className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingVariantId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Tên biến thể *</Label>
                      <Input
                        value={editVariantData.name ?? v.name}
                        onChange={(e) => setEditVariantData({ ...editVariantData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">SKU</Label>
                      <Input
                        value={editVariantData.sku ?? v.sku}
                        onChange={(e) => setEditVariantData({ ...editVariantData, sku: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Mã vạch</Label>
                      <Input
                        value={editVariantData.barcode ?? v.barcode}
                        onChange={(e) => setEditVariantData({ ...editVariantData, barcode: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Giá nhập</Label>
                      <Input
                        type="number"
                        value={editVariantData.cost_price ?? v.cost_price}
                        onChange={(e) => setEditVariantData({ ...editVariantData, cost_price: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Giá bán *</Label>
                      <Input
                        type="number"
                        value={editVariantData.selling_price ?? v.selling_price}
                        onChange={(e) => setEditVariantData({ ...editVariantData, selling_price: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Read-only mode */
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{v.name}</h4>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingVariantId(v.id);
                          setEditVariantData({
                            name: v.name,
                            sku: v.sku || "",
                            barcode: v.barcode || "",
                            cost_price: v.cost_price,
                            selling_price: v.selling_price,
                          });
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {(product.variants?.length || 0) > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => deleteVariantMutation.mutate(v.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">SKU</Label>
                      <p className="text-sm font-mono">{v.sku || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Mã vạch</Label>
                      <p className="text-sm font-mono">{v.barcode || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Giá nhập</Label>
                      <p className="text-sm">{(v.cost_price || 0).toLocaleString()}đ</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Giá bán</Label>
                      <p className="text-sm font-medium">{(v.selling_price || 0).toLocaleString()}đ</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Add Variant Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Thêm biến thể mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Tên biến thể *</Label>
                <Input
                  value={newVariant.name}
                  onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                  placeholder="256GB - Đen"
                />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input
                  value={newVariant.sku || ""}
                  onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })}
                  placeholder="Tự sinh nếu để trống"
                />
              </div>
              <div className="space-y-2">
                <Label>Mã vạch</Label>
                <Input
                  value={newVariant.barcode || ""}
                  onChange={(e) => setNewVariant({ ...newVariant, barcode: e.target.value })}
                  placeholder="8901234567890"
                />
              </div>
              <div className="space-y-2">
                <Label>Giá nhập</Label>
                <Input
                  type="number"
                  value={newVariant.cost_price || ""}
                  onChange={(e) => setNewVariant({ ...newVariant, cost_price: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Giá bán *</Label>
                <Input
                  type="number"
                  value={newVariant.selling_price || ""}
                  onChange={(e) => setNewVariant({ ...newVariant, selling_price: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Tồn kho ban đầu</Label>
                <Input
                  type="number"
                  value={newVariant.initial_stock || ""}
                  onChange={(e) => setNewVariant({ ...newVariant, initial_stock: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                addVariantMutation.mutate({
                  name: newVariant.name,
                  sku: newVariant.sku || undefined,
                  barcode: newVariant.barcode || undefined,
                  cost_price: newVariant.cost_price,
                  selling_price: newVariant.selling_price,
                  initial_stock: newVariant.initial_stock || 0,
                });
              }}
              disabled={!newVariant.name.trim() || addVariantMutation.isPending}
            >
              {addVariantMutation.isPending ? "Đang tạo..." : "Thêm biến thể"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
