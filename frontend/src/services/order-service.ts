import api from "@/lib/api";
import type {
  ApiResponse,
  PaginatedResponse,
  OrderResponse,
  CreateOrderRequest,
  CustomerPurchasedItemResponse,
} from "@/types/api";

export const orderService = {
  list: async (params?: Record<string, string | number | boolean>) => {
    const response = await api.get<PaginatedResponse<OrderResponse>>("/orders", {
      params,
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<OrderResponse>>(`/orders/${id}`);
    return response.data.data;
  },

  create: async (data: CreateOrderRequest) => {
    const response = await api.post<ApiResponse<OrderResponse>>("/orders", data);
    return response.data.data;
  },

  cancel: async (id: string, reason: string) => {
    const response = await api.post<ApiResponse<null>>(`/orders/${id}/cancel`, { reason });
    return response.data;
  },

  refund: async (id: string, reason: string) => {
    const response = await api.post<ApiResponse<null>>(`/orders/${id}/refund`, { reason });
    return response.data;
  },

  getDailySummary: async (date?: string) => {
    const response = await api.get<ApiResponse<Record<string, unknown>>>("/orders/daily-summary", {
      params: date ? { date } : undefined,
    });
    return response.data.data;
  },

  getCustomerPurchasedItems: async (customerId: string) => {
    const response = await api.get<ApiResponse<CustomerPurchasedItemResponse[]>>(
      `/orders/customer/${customerId}/items`
    );
    return response.data.data;
  },
};
