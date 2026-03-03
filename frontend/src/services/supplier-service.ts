import api from "@/lib/api";
import type {
  ApiResponse,
  PaginatedResponse,
  PurchaseOrderResponse,
} from "@/types/api";

export interface SupplierResponse {
  id: string;
  store_id: string;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  tax_code: string;
  bank_account: string;
  bank_name: string;
  notes: string;
  is_active: boolean;
  created_at: string;
}

export interface SupplierDebtSummary {
  total_orders: number;
  total_amount: number;
  received_amount: number;
  pending_amount: number;
  draft_orders: number;
  confirmed_orders: number;
  received_orders: number;
  cancelled_orders: number;
}

export interface CreateSupplierRequest {
  name: string;
  contact_name?: string;
  phone: string;
  email?: string;
  address?: string;
  tax_code?: string;
  bank_account?: string;
  bank_name?: string;
  notes?: string;
}

export interface UpdateSupplierRequest {
  name?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_code?: string;
  bank_account?: string;
  bank_name?: string;
  notes?: string;
  is_active?: boolean;
}

export const supplierService = {
  list: async (params?: Record<string, string | number | boolean>) => {
    const response = await api.get<PaginatedResponse<SupplierResponse>>("/suppliers", {
      params,
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<SupplierResponse>>(`/suppliers/${id}`);
    return response.data.data;
  },

  create: async (data: CreateSupplierRequest) => {
    const response = await api.post<ApiResponse<SupplierResponse>>("/suppliers", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateSupplierRequest) => {
    const response = await api.put<ApiResponse<SupplierResponse>>(
      `/suppliers/${id}`,
      data
    );
    return response.data.data;
  },

  delete: async (id: string) => {
    await api.delete(`/suppliers/${id}`);
  },

  getPurchaseOrders: async (id: string, params?: Record<string, string | number | boolean>) => {
    const response = await api.get<PaginatedResponse<PurchaseOrderResponse>>(
      `/suppliers/${id}/purchase-orders`,
      { params }
    );
    return response.data;
  },

  getDebtSummary: async (id: string) => {
    const response = await api.get<ApiResponse<SupplierDebtSummary>>(
      `/suppliers/${id}/debt-summary`
    );
    return response.data.data;
  },
};
