"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Package,
  Tag,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { productService } from "@/services/product-service";
import { formatVND } from "@/lib/utils";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => productService.getById(id),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-60" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-60" />
          <Skeleton className="h-60" />
        </div>
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
        title={product.name}
        description={product.brand || "Sản phẩm"}
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>
        <Button onClick={() => router.push(`/dashboard/products/${id}/edit`)}>
          <Pencil className="mr-2 h-4 w-4" /> Chỉnh sửa
        </Button>
      </PageHeader>

      {/* Product info */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" /> Thông tin sản phẩm
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Tên sản phẩm</dt>
                <dd className="font-medium">{product.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Thương hiệu</dt>
                <dd className="font-medium">{product.brand || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Danh mục</dt>
                <dd className="font-medium">{product.category?.name || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Đơn vị</dt>
                <dd className="font-medium">{product.unit}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Trạng thái</dt>
                <dd>
                  <Badge variant={product.is_active ? "default" : "outline"}>
                    {product.is_active ? "Đang bán" : "Ngừng bán"}
                  </Badge>
                </dd>
              </div>
              {product.tags?.length > 0 && (
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Tags</dt>
                  <dd className="flex flex-wrap gap-1">
                    {product.tags.map((t: string) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </dd>
                </div>
              )}
              {product.description && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">Mô tả</dt>
                  <dd className="text-sm mt-1">{product.description}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Tổng quan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Tổng biến thể</p>
              <p className="text-3xl font-bold">{product.variants?.length || 0}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Tổng tồn kho</p>
              <p className="text-3xl font-bold">
                {product.variants?.reduce(
                  (sum: number, v: { inventory?: { available_qty?: number; quantity?: number } }) =>
                    sum + (v.inventory?.available_qty ?? v.inventory?.quantity ?? 0),
                  0
                ) || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" /> Biến thể ({product.variants?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-3 font-medium">Tên</th>
                  <th className="text-left p-3 font-medium">SKU</th>
                  <th className="text-left p-3 font-medium">Mã vạch</th>
                  <th className="text-right p-3 font-medium">Giá nhập</th>
                  <th className="text-right p-3 font-medium">Giá bán</th>
                  <th className="text-right p-3 font-medium">Tồn kho</th>
                  <th className="text-center p-3 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {product.variants?.map((v) => (
                  <tr key={v.id} className="border-t">
                    <td className="p-3 font-medium">{v.name}</td>
                    <td className="p-3 font-mono text-xs">{v.sku || "—"}</td>
                    <td className="p-3 font-mono text-xs">{v.barcode || "—"}</td>
                    <td className="p-3 text-right">{formatVND(v.cost_price)}</td>
                    <td className="p-3 text-right font-medium">
                      {formatVND(v.selling_price)}
                    </td>
                    <td className="p-3 text-right">
                      <span
                        className={
                          (v.inventory?.available_qty ?? v.inventory?.quantity ?? 0) === 0
                            ? "text-red-600 font-medium"
                            : v.inventory?.is_low_stock
                            ? "text-yellow-600 font-medium"
                            : ""
                        }
                      >
                        {v.inventory?.available_qty ?? v.inventory?.quantity ?? 0}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={v.is_active ? "default" : "outline"} className="text-xs">
                        {v.is_active ? "Đang bán" : "Ngừng"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
