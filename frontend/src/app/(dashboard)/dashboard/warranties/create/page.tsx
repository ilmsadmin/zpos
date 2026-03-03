"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Search,
  ShoppingBag,
  Shield,
  CheckCircle2,
  Package,
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
import { warrantyService } from "@/services/warranty-service";
import { customerService } from "@/services/customer-service";
import { orderService } from "@/services/order-service";
import { formatDate, formatVND } from "@/lib/utils";
import type {
  CustomerResponse,
  CustomerPurchasedItemResponse,
} from "@/types/api";

export default function CreateWarrantyPage() {
  const router = useRouter();

  // Step 1: Customer
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerResponse | null>(null);

  // Step 2: Product from purchases
  const [selectedItem, setSelectedItem] =
    useState<CustomerPurchasedItemResponse | null>(null);

  // Step 3: Warranty details
  const [serialNumber, setSerialNumber] = useState("");
  const [warrantyMonths, setWarrantyMonths] = useState("");
  const [terms, setTerms] = useState("");
  const [notes, setNotes] = useState("");

  // Customer search
  const { data: customers } = useQuery({
    queryKey: ["customers-search", customerSearch],
    queryFn: () => customerService.search(customerSearch),
    enabled: customerSearch.length >= 2 && !selectedCustomer,
  });

  // Purchased items for selected customer
  const { data: purchasedItems, isLoading: itemsLoading } = useQuery({
    queryKey: ["customer-purchased-items", selectedCustomer?.id],
    queryFn: () =>
      orderService.getCustomerPurchasedItems(selectedCustomer!.id),
    enabled: !!selectedCustomer,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      warrantyService.create({
        order_item_id: selectedItem?.order_item_id,
        customer_id: selectedCustomer!.id,
        product_variant_id: selectedItem!.product_variant_id,
        serial_number: serialNumber,
        warranty_months: parseInt(warrantyMonths),
        terms: terms || undefined,
        notes: notes || undefined,
      }),
    onSuccess: (data) => {
      toast.success("Đã tạo phiếu bảo hành");
      router.push(`/dashboard/warranties/${data.id}`);
    },
    onError: () => toast.error("Không thể tạo phiếu bảo hành"),
  });

  const handleSelectCustomer = (c: CustomerResponse) => {
    setSelectedCustomer(c);
    setCustomerSearch("");
    // Reset downstream selections
    setSelectedItem(null);
    setSerialNumber("");
    setWarrantyMonths("");
    setTerms("");
    setNotes("");
  };

  const handleSelectItem = (item: CustomerPurchasedItemResponse) => {
    setSelectedItem(item);
    // Pre-fill warranty months from order item
    if (item.warranty_months > 0) {
      setWarrantyMonths(String(item.warranty_months));
    } else {
      setWarrantyMonths("12");
    }
  };

  const handleChangeCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setSelectedItem(null);
    setSerialNumber("");
    setWarrantyMonths("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selectedCustomer ||
      !selectedItem ||
      !serialNumber ||
      !warrantyMonths
    ) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    createMutation.mutate();
  };

  // Items without existing warranty
  const availableItems =
    purchasedItems?.filter((item) => !item.has_warranty) || [];
  const itemsWithWarranty =
    purchasedItems?.filter((item) => item.has_warranty) || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tạo phiếu bảo hành"
        description="Tạo phiếu bảo hành dựa trên sản phẩm khách hàng đã mua"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Customer Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-bold">
                1
              </span>
              Chọn khách hàng
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCustomer ? (
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {selectedCustomer.full_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCustomer.phone}
                        {selectedCustomer.email &&
                          ` • ${selectedCustomer.email}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleChangeCustomer}
                  >
                    Thay đổi
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm khách hàng (tên, SĐT)..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {customers && customers.length > 0 && (
                  <div className="border rounded-lg max-h-48 overflow-auto">
                    {customers.map((c: CustomerResponse) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-muted/50 text-sm border-b last:border-0"
                        onClick={() => handleSelectCustomer(c)}
                      >
                        <p className="font-medium">{c.full_name}</p>
                        <p className="text-muted-foreground text-xs">
                          {c.phone}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Product Selection from Purchases */}
        {selectedCustomer && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-bold">
                  2
                </span>
                Chọn sản phẩm đã mua
              </CardTitle>
            </CardHeader>
            <CardContent>
              {itemsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Đang tải danh sách sản phẩm...
                </div>
              ) : !purchasedItems?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="mx-auto h-10 w-10 mb-2 opacity-50" />
                  <p>Khách hàng chưa có đơn hàng nào</p>
                </div>
              ) : availableItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="mx-auto h-10 w-10 mb-2 opacity-50" />
                  <p>Tất cả sản phẩm đã có phiếu bảo hành</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableItems.map((item) => {
                    const isSelected =
                      selectedItem?.order_item_id === item.order_item_id;
                    return (
                      <button
                        key={item.order_item_id}
                        type="button"
                        className={`w-full text-left border rounded-lg p-4 transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => handleSelectItem(item)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium truncate">
                                {item.product_name}
                              </p>
                              {isSelected && (
                                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                              )}
                            </div>
                            {item.variant_name && (
                              <p className="text-sm text-muted-foreground">
                                {item.variant_name}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground font-mono mt-1">
                              SKU: {item.sku}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-medium">
                              {formatVND(item.unit_price)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              SL: {item.quantity}
                            </p>
                            {item.warranty_months > 0 && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                BH {item.warranty_months} tháng
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>Đơn: {item.order_number}</span>
                          <span>•</span>
                          <span>{formatDate(item.order_date)}</span>
                        </div>
                      </button>
                    );
                  })}

                  {/* Show items that already have warranty */}
                  {itemsWithWarranty.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Đã có bảo hành ({itemsWithWarranty.length})
                      </p>
                      {itemsWithWarranty.map((item) => (
                        <div
                          key={item.order_item_id}
                          className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground opacity-60"
                        >
                          <span className="truncate">
                            {item.product_name}
                          </span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            <Shield className="h-3 w-3 mr-1" />
                            Đã BH
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Warranty Details */}
        {selectedItem && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-bold">
                  3
                </span>
                Thông tin bảo hành
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="serial">Số serial *</Label>
                  <Input
                    id="serial"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="Nhập số serial sản phẩm"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="months">Thời hạn bảo hành *</Label>
                  <Select
                    value={warrantyMonths}
                    onValueChange={setWarrantyMonths}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn thời hạn" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 tháng</SelectItem>
                      <SelectItem value="6">6 tháng</SelectItem>
                      <SelectItem value="12">12 tháng</SelectItem>
                      <SelectItem value="18">18 tháng</SelectItem>
                      <SelectItem value="24">24 tháng</SelectItem>
                      <SelectItem value="36">36 tháng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="terms">Điều khoản bảo hành</Label>
                  <Textarea
                    id="terms"
                    value={terms}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setTerms(e.target.value)
                    }
                    placeholder="Nhập điều khoản bảo hành (tùy chọn)"
                    rows={3}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="notes">Ghi chú</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setNotes(e.target.value)
                    }
                    placeholder="Ghi chú thêm (tùy chọn)"
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {selectedItem && (
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending ||
                !selectedCustomer ||
                !selectedItem ||
                !serialNumber ||
                !warrantyMonths
              }
            >
              <Shield className="mr-2 h-4 w-4" />
              {createMutation.isPending
                ? "Đang tạo..."
                : "Tạo phiếu bảo hành"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
