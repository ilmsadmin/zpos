"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Truck,
  Phone,
  Mail,
  MapPin,
  Building2,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supplierService } from "@/services/supplier-service";
import { formatDate } from "@/lib/utils";

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params.id as string;

  const { data: supplier, isLoading } = useQuery({
    queryKey: ["suppliers", supplierId],
    queryFn: () => supplierService.getById(supplierId),
    enabled: !!supplierId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Không tìm thấy nhà cung cấp</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{supplier.name}</h1>
            <Badge variant={supplier.is_active ? "default" : "secondary"}>
              {supplier.is_active ? "Hoạt động" : "Ngừng"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Thêm ngày {formatDate(supplier.created_at)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4" />
              Thông tin liên hệ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {supplier.contact_name && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>Người liên hệ: <strong>{supplier.contact_name}</strong></span>
              </div>
            )}
            {supplier.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{supplier.phone}</span>
              </div>
            )}
            {supplier.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{supplier.email}</span>
              </div>
            )}
            {supplier.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{supplier.address}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              Thông tin tài chính
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {supplier.tax_code && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mã số thuế</span>
                <span className="font-mono font-medium">{supplier.tax_code}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
