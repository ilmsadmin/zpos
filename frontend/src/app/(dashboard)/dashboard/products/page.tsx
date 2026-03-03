"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Download,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { productService } from "@/services/product-service";
import { categoryService } from "@/services/category-service";
import { formatVND } from "@/lib/utils";
import { toast } from "sonner";
import type { ProductResponse } from "@/types/api";

export default function ProductsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["products", page, search, categoryFilter],
    queryFn: () =>
      productService.list({
        page,
        limit: 20,
        search: search || undefined,
        category_id: categoryFilter !== "all" ? categoryFilter : undefined,
      } as Record<string, string | number | boolean>),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.getTree(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Đã xóa sản phẩm");
      setDeleteId(null);
    },
    onError: () => toast.error("Không thể xóa sản phẩm"),
  });

  const columns: Column<ProductResponse>[] = [
    {
      key: "name",
      header: "Sản phẩm",
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-lg">
            📱
          </div>
          <div>
            <button
              className="font-medium text-primary hover:underline text-left"
              onClick={() => router.push(`/dashboard/products/${p.id}`)}
            >
              {p.name}
            </button>
            <p className="text-xs text-muted-foreground">{p.brand}</p>
          </div>
        </div>
      ),
    },
    {
      key: "variants",
      header: "Biến thể",
      className: "text-center",
      render: (p) => (
        <span className="text-sm text-muted-foreground">
          {p.variants?.length || 0} loại
        </span>
      ),
    },
    {
      key: "category",
      header: "Danh mục",
      render: (p) => p.category?.name || "—",
    },
    {
      key: "stock",
      header: "Tồn kho",
      className: "text-center",
      render: (p) => {
        const totalStock = p.variants?.reduce(
          (sum, v) => sum + (v.inventory?.available_qty ?? v.inventory?.quantity ?? 0),
          0
        ) || 0;
        return (
          <span className={totalStock <= 0 ? "text-destructive font-medium" : "text-sm"}>
            {totalStock}
          </span>
        );
      },
    },
    {
      key: "price",
      header: "Giá bán",
      className: "text-right",
      render: (p) => (
        <span className="font-medium">
          {p.variants?.[0] ? formatVND(p.variants[0].selling_price) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (p) => (
        <Badge variant={p.is_active ? "default" : "outline"}>
          {p.is_active ? "Đang bán" : "Ngừng bán"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[50px]",
      render: (p) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/dashboard/products/${p.id}`)}>
              <Eye className="mr-2 h-4 w-4" /> Xem chi tiết
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/dashboard/products/${p.id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" /> Chỉnh sửa
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteId(p.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Xóa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Sản phẩm" description="Quản lý danh mục sản phẩm">
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" /> Import
        </Button>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
        <Button size="sm" onClick={() => router.push("/dashboard/products/create")}>
          <Plus className="mr-2 h-4 w-4" /> Thêm sản phẩm
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, SKU, mã vạch..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        page={page}
        limit={20}
        total={data?.pagination?.total || 0}
        onPageChange={setPage}
        keyExtractor={(p) => p.id}
        emptyMessage="Chưa có sản phẩm nào"
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Xóa sản phẩm"
        description="Bạn có chắc muốn xóa sản phẩm này? Hành động không thể hoàn tác."
        variant="destructive"
        confirmLabel="Xóa"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
