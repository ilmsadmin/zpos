import api from "@/lib/api";
import type {
  ApiResponse,
  PaginatedResponse,
  CustomerResponse,
  CreateCustomerRequest,
  OrderResponse,
  WarrantyResponse,
} from "@/types/api";

export interface UpdateCustomerRequest {
  full_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  date_of_birth?: string;
  gender?: "male" | "female" | "other";
  notes?: string;
  tags?: string[];
  is_active?: boolean;
}

export const customerService = {
  list: async (params?: Record<string, string | number | boolean>) => {
    const response = await api.get<PaginatedResponse<CustomerResponse>>("/customers", {
      params,
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<CustomerResponse>>(`/customers/${id}`);
    return response.data.data;
  },

  create: async (data: CreateCustomerRequest) => {
    const response = await api.post<ApiResponse<CustomerResponse>>("/customers", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateCustomerRequest) => {
    const response = await api.put<ApiResponse<CustomerResponse>>(
      `/customers/${id}`,
      data
    );
    return response.data.data;
  },

  delete: async (id: string) => {
    await api.delete(`/customers/${id}`);
  },

  search: async (query: string) => {
    const response = await api.get<ApiResponse<CustomerResponse[]>>(
      "/customers/search",
      { params: { q: query } }
    );
    return response.data.data;
  },

  getOrders: async (id: string, params?: Record<string, string | number | boolean>) => {
    const response = await api.get<PaginatedResponse<OrderResponse>>(
      `/customers/${id}/orders`,
      { params }
    );
    return response.data;
  },

  getWarranties: async (id: string, params?: Record<string, string | number | boolean>) => {
    const response = await api.get<PaginatedResponse<WarrantyResponse>>(
      `/customers/${id}/warranties`,
      { params }
    );
    return response.data;
  },
};
