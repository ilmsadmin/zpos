"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Package,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { inventoryService, type InventoryMovementResponse } from "@/services/inventory-service";
import { productService } from "@/services/product-service";
import type { InventoryResponse, ProductResponse } from "@/types/api";

interface InventoryRow {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  min_stock_level: number;
  location: string;
  is_low_stock: boolean;
}

export default function InventoryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Fetch products with inventory info via variants
  const { data: productData, isLoading: productsLoading } = useQuery({
    queryKey: ["products-inventory", page, search],
    queryFn: () =>
      productService.list({ page, limit: 20, search: search || undefined } as Record<string, string | number | boolean>),
  });

  const { data: lowStockData } = useQuery({
    queryKey: ["low-stock"],
    queryFn: () => inventoryService.getLowStock({ limit: 100 }),
  });

  // Build inventory rows from product data
  const inventoryRows: InventoryRow[] = (productData?.data || []).flatMap((product: ProductResponse) =>
    (product.variants || []).map((v) => ({
      id: v.id,
      name: `${product.name} - ${v.name}`,
      sku: v.sku,
      quantity: v.inventory?.available_qty ?? v.inventory?.quantity ?? 0,
      min_stock_level: v.inventory?.min_stock_level ?? 0,
      location: v.inventory?.location || "—",
      is_low_stock: v.inventory?.is_low_stock ?? false,
    }))
  );

  const filteredRows = inventoryRows.filter((row) => {
    if (stockFilter === "low") return row.is_low_stock && row.quantity > 0;
    if (stockFilter === "out") return row.quantity === 0;
    if (stockFilter === "in_stock") return row.quantity > 0 && !row.is_low_stock;
    return true;
  });

  const lowStockCount = lowStockData?.pagination?.total || 0;
  const outOfStockCount = inventoryRows.filter((r) => r.quantity === 0).length;
  const totalItems = inventoryRows.reduce((sum, r) => sum + r.quantity, 0);

  const columns: Column<InventoryRow>[] = [
    {
      key: "name",
      header: "Sản phẩm",
      render: (r) => (
        <button
          className="font-medium text-primary hover:underline text-left"
          onClick={() => router.push(`/dashboard/inventory/${r.id}/movements`)}
        >
          {r.name}
        </button>
      ),
    },
    {
      key: "sku",
      header: "SKU",
      render: (r) => <span className="font-mono text-sm">{r.sku}</span>,
    },
    {
      key: "quantity",
      header: "Tồn kho",
      className: "text-right",
      render: (r) => <span className="font-medium">{r.quantity}</span>,
    },
    {
      key: "min",
      header: "Tối thiểu",
      className: "text-right",
      render: (r) => <span className="text-muted-foreground">{r.min_stock_level}</span>,
    },
    {
      key: "location",
      header: "Vị trí",
      render: (r) => r.location,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (r) => {
        if (r.quantity === 0) return <Badge variant="destructive">Hết hàng</Badge>;
        if (r.is_low_stock) return <Badge variant="secondary">Sắp hết</Badge>;
        return <Badge variant="default">Còn hàng</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Kho hàng" description="Quản lý tồn kho và lịch sử xuất nhập">
        <Button size="sm" onClick={() => router.push("/dashboard/inventory/adjust")}>
          Điều chỉnh tồn kho
        </Button>
      </PageHeader>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Tổng tồn kho</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Sắp hết hàng</p>
                <p className="text-2xl font-bold">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Hết hàng</p>
                <p className="text-2xl font-bold">{outOfStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Loại sản phẩm</p>
                <p className="text-2xl font-bold">{inventoryRows.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, SKU..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select value={stockFilter} onValueChange={(v) => setStockFilter(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="in_stock">Còn hàng</SelectItem>
                <SelectItem value="low">Sắp hết</SelectItem>
                <SelectItem value="out">Hết hàng</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={filteredRows}
        isLoading={productsLoading}
        page={page}
        limit={20}
        total={productData?.pagination?.total || 0}
        onPageChange={setPage}
        keyExtractor={(r) => r.id}
        emptyMessage="Không có dữ liệu tồn kho"
      />
    </div>
  );
}
