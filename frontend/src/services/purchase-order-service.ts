import api from "@/lib/api";
import type {
  ApiResponse,
  PaginatedResponse,
  PurchaseOrderResponse,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  ReceivePurchaseOrderRequest,
} from "@/types/api";

export const purchaseOrderService = {
  list: async (params?: Record<string, string | number | boolean>) => {
    const response = await api.get<PaginatedResponse<PurchaseOrderResponse>>(
      "/purchase-orders",
      { params }
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<PurchaseOrderResponse>>(
      `/purchase-orders/${id}`
    );
    return response.data.data;
  },

  create: async (data: CreatePurchaseOrderRequest) => {
    const response = await api.post<ApiResponse<PurchaseOrderResponse>>(
      "/purchase-orders",
      data
    );
    return response.data.data;
  },

  update: async (id: string, data: UpdatePurchaseOrderRequest) => {
    const response = await api.put<ApiResponse<PurchaseOrderResponse>>(
      `/purchase-orders/${id}`,
      data
    );
    return response.data.data;
  },

  approve: async (id: string) => {
    const response = await api.post<ApiResponse<null>>(
      `/purchase-orders/${id}/approve`
    );
    return response.data;
  },

  receive: async (id: string, data: ReceivePurchaseOrderRequest) => {
    const response = await api.post<ApiResponse<PurchaseOrderResponse>>(
      `/purchase-orders/${id}/receive`,
      data
    );
    return response.data.data;
  },
};
