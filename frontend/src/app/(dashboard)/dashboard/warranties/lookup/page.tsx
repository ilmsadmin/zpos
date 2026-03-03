"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Search, Shield, ArrowLeft, User, Package, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { warrantyService } from "@/services/warranty-service";
import { formatDate } from "@/lib/utils";
import type { WarrantyResponse } from "@/types/api";

const warrantyStatusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  active: { label: "Còn bảo hành", variant: "default" },
  expired: { label: "Hết hạn", variant: "destructive" },
  voided: { label: "Đã hủy", variant: "outline" },
};

export default function WarrantyLookupPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WarrantyResponse[] | null>(null);

  const lookupMutation = useMutation({
    mutationFn: (q: string) => warrantyService.lookup(q),
    onSuccess: (data) => setResults(data || []),
    onError: () => setResults([]),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      lookupMutation.mutate(query.trim());
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tra cứu bảo hành"
        description="Tìm kiếm phiếu bảo hành theo mã BH, số serial, SĐT khách hàng, hoặc mã đơn hàng"
      >
        <Button variant="outline" onClick={() => router.push("/dashboard/warranties")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Danh sách BH
        </Button>
      </PageHeader>

      {/* Search form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nhập mã bảo hành, số serial, SĐT, hoặc mã đơn hàng..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 h-12 text-base"
                autoFocus
              />
            </div>
            <Button type="submit" size="lg" disabled={lookupMutation.isPending || !query.trim()}>
              {lookupMutation.isPending ? "Đang tìm..." : "Tra cứu"}
            </Button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="bg-muted px-2 py-1 rounded">Mã BH: WRT-20260301-12345</span>
            <span className="bg-muted px-2 py-1 rounded">Serial: SN123456789</span>
            <span className="bg-muted px-2 py-1 rounded">SĐT: 0901234567</span>
            <span className="bg-muted px-2 py-1 rounded">Đơn hàng: ORD-20260301-001</span>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results !== null && (
        <>
          {results.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-1">Không tìm thấy kết quả</h3>
                <p className="text-muted-foreground">
                  Không tìm thấy phiếu bảo hành nào phù hợp với &ldquo;{query}&rdquo;
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Tìm thấy <strong>{results.length}</strong> phiếu bảo hành
              </p>
              {results.map((warranty) => {
                const ws = warrantyStatusMap[warranty.status] || {
                  label: warranty.status,
                  variant: "secondary" as const,
                };
                return (
                  <Card
                    key={warranty.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => router.push(`/dashboard/warranties/${warranty.id}`)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                            <Shield className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-mono font-semibold text-base">
                              {warranty.warranty_code}
                            </p>
                            {warranty.serial_number && (
                              <p className="text-sm text-muted-foreground font-mono">
                                SN: {warranty.serial_number}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant={ws.variant}>
                          {ws.label}
                          {warranty.days_remaining > 0 &&
                            warranty.status === "active" &&
                            ` (${warranty.days_remaining} ngày)`}
                        </Badge>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3 text-sm">
                        {warranty.product_variant && (
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{warranty.product_variant.name}</p>
                              <p className="text-xs text-muted-foreground">
                                SKU: {warranty.product_variant.sku}
                              </p>
                            </div>
                          </div>
                        )}
                        {warranty.customer && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{warranty.customer.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {warranty.customer.phone}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {warranty.warranty_months} tháng
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(warranty.start_date)} → {formatDate(warranty.end_date)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {warranty.claims && warranty.claims.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-muted-foreground">
                            {warranty.claims.length} yêu cầu bảo hành
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
