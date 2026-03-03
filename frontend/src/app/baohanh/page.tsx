"use client";

import { useState } from "react";
import { Search, Shield, ShieldCheck, ShieldAlert, ShieldX, Clock, Phone, Hash, Barcode, ChevronDown, ChevronUp, Loader2, Package } from "lucide-react";
import { warrantyPublicService, type PublicWarrantyResponse, type PublicWarrantyClaimResponse } from "./warranty-public-service";

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
  active: {
    label: "Còn bảo hành",
    color: "text-emerald-700 dark:text-emerald-400",
    icon: <ShieldCheck className="h-5 w-5" />,
    bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
  },
  expiring: {
    label: "Sắp hết hạn",
    color: "text-amber-700 dark:text-amber-400",
    icon: <ShieldAlert className="h-5 w-5" />,
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
  },
  expired: {
    label: "Hết hạn",
    color: "text-red-700 dark:text-red-400",
    icon: <ShieldX className="h-5 w-5" />,
    bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
  },
  voided: {
    label: "Đã hủy",
    color: "text-gray-700 dark:text-gray-400",
    icon: <ShieldX className="h-5 w-5" />,
    bg: "bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-800",
  },
};

const CLAIM_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "Chờ tiếp nhận", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  received: { label: "Đã tiếp nhận", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  processing: { label: "Đang xử lý", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400" },
  completed: { label: "Hoàn thành", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "Từ chối", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  returned: { label: "Đã trả máy", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function WarrantyCard({ warranty }: { warranty: PublicWarrantyResponse }) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_MAP[warranty.status] || STATUS_MAP.expired;

  return (
    <div className={`rounded-xl border-2 ${status.bg} overflow-hidden transition-all duration-300`}>
      {/* Header */}
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status.color} bg-white/60 dark:bg-white/5`}>
              {status.icon}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mã bảo hành</p>
              <p className="font-mono font-bold text-lg">{warranty.warranty_code}</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${status.color} bg-white/60 dark:bg-white/10`}>
            {status.icon}
            {status.label}
          </span>
        </div>

        {/* Product Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="flex items-start gap-3">
            <Package className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Sản phẩm</p>
              <p className="font-medium">{warranty.product_name}</p>
              {warranty.variant_name && (
                <p className="text-sm text-muted-foreground">{warranty.variant_name}</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Barcode className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Số Serial</p>
              <p className="font-medium font-mono">{warranty.serial_number}</p>
            </div>
          </div>
        </div>

        {/* Warranty Period */}
        <div className="bg-white/50 dark:bg-white/5 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Thời hạn bảo hành</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Từ ngày</p>
              <p className="font-semibold">{formatDate(warranty.start_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Đến ngày</p>
              <p className="font-semibold">{formatDate(warranty.end_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Còn lại</p>
              <p className={`font-bold text-lg ${warranty.days_remaining > 30 ? "text-emerald-600 dark:text-emerald-400" : warranty.days_remaining > 0 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                {warranty.days_remaining > 0 ? `${warranty.days_remaining} ngày` : "Hết hạn"}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  warranty.days_remaining > 30
                    ? "bg-emerald-500"
                    : warranty.days_remaining > 0
                      ? "bg-amber-500"
                      : "bg-red-500"
                }`}
                style={{
                  width: `${Math.max(0, Math.min(100, (warranty.days_remaining / (warranty.warranty_months * 30)) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Customer info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            <span>{warranty.customer_phone}</span>
          </div>
          <span>•</span>
          <span>{warranty.customer_name}</span>
          <span>•</span>
          <span>{warranty.warranty_months} tháng bảo hành</span>
        </div>

        {/* Terms */}
        {warranty.terms && (
          <div className="mt-3 p-3 bg-white/40 dark:bg-white/5 rounded-lg text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Điều khoản bảo hành:</p>
            <p className="whitespace-pre-line">{warranty.terms}</p>
          </div>
        )}
      </div>

      {/* Claims section */}
      {warranty.claims && warranty.claims.length > 0 && (
        <div className="border-t border-inherit">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-white/30 dark:hover:bg-white/5 transition-colors"
          >
            <span className="text-sm font-medium flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Lịch sử yêu cầu bảo hành ({warranty.claims.length})
            </span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {expanded && (
            <div className="px-4 pb-4 space-y-3">
              {warranty.claims.map((claim: PublicWarrantyClaimResponse, idx: number) => (
                <ClaimCard key={idx} claim={claim} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ClaimCard({ claim }: { claim: PublicWarrantyClaimResponse }) {
  const status = CLAIM_STATUS_MAP[claim.status] || CLAIM_STATUS_MAP.pending;

  return (
    <div className="bg-white/60 dark:bg-white/5 rounded-lg p-4 border border-white/80 dark:border-white/10">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-sm font-semibold">{claim.claim_number}</span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
          {status.label}
        </span>
      </div>
      <p className="text-sm mb-2">{claim.issue}</p>
      {claim.resolution && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Kết quả:</span> {claim.resolution}
        </p>
      )}
      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
        <span>Tạo: {formatDate(claim.created_at)}</span>
        {claim.received_date && <span>Tiếp nhận: {formatDate(claim.received_date)}</span>}
        {claim.completed_date && <span>Hoàn thành: {formatDate(claim.completed_date)}</span>}
        {claim.returned_date && <span>Trả máy: {formatDate(claim.returned_date)}</span>}
      </div>
    </div>
  );
}

export default function WarrantyLookupPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicWarrantyResponse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || query.trim().length < 3) {
      setError("Vui lòng nhập ít nhất 3 ký tự");
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const data = await warrantyPublicService.lookup(query.trim());
      setResults(data);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message || "Có lỗi xảy ra, vui lòng thử lại"
          : "Có lỗi xảy ra, vui lòng thử lại";
      setError(message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 dark:from-blue-500/5 dark:to-indigo-500/5" />
        <div className="relative max-w-4xl mx-auto px-4 pt-12 pb-8 sm:pt-16 sm:pb-12 text-center">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white mb-6 shadow-lg shadow-blue-500/25">
            <Shield className="h-8 w-8" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Tra cứu bảo hành
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
            Kiểm tra thông tin và trạng thái bảo hành sản phẩm của bạn
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative flex items-center">
              <div className="absolute left-4 text-muted-foreground">
                <Search className="h-5 w-5" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Nhập mã bảo hành, số serial hoặc số điện thoại..."
                className="w-full pl-12 pr-32 py-4 text-base rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-lg shadow-gray-200/50 dark:shadow-none transition-all placeholder:text-muted-foreground/60"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Tra cứu"
                )}
              </button>
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </form>

          {/* Help text */}
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" />
              <span>Mã bảo hành (VD: WRT-20250101-12345)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Barcode className="h-3.5 w-3.5" />
              <span>Số serial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              <span>Số điện thoại</span>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
            <p className="text-muted-foreground">Đang tìm kiếm...</p>
          </div>
        )}

        {!loading && searched && results && results.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <ShieldX className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Không tìm thấy thông tin bảo hành</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Vui lòng kiểm tra lại mã bảo hành, số serial hoặc số điện thoại. 
              Nếu cần hỗ trợ, vui lòng liên hệ cửa hàng nơi bạn mua sản phẩm.
            </p>
          </div>
        )}

        {!loading && results && results.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Tìm thấy {results.length} kết quả
              </h2>
            </div>
            {results.map((warranty, idx) => (
              <WarrantyCard key={idx} warranty={warranty} />
            ))}
          </div>
        )}

        {!searched && !loading && (
          <div className="text-center py-12">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-1">Tra cứu nhanh</h3>
                <p className="text-sm text-muted-foreground">
                  Nhập mã bảo hành, số serial hoặc SĐT để kiểm tra
                </p>
              </div>
              <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-4">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-1">Trạng thái bảo hành</h3>
                <p className="text-sm text-muted-foreground">
                  Xem thời hạn và trạng thái bảo hành sản phẩm
                </p>
              </div>
              <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mb-4">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-1">Lịch sử sửa chữa</h3>
                <p className="text-sm text-muted-foreground">
                  Theo dõi tiến độ các yêu cầu bảo hành
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-6 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Zplus POS. Hệ thống quản lý bán hàng & bảo hành.</p>
      </footer>
    </div>
  );
}
