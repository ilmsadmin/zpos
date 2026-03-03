import api from "@/lib/api";
import type {
  ApiResponse,
  StoreResponse,
} from "@/types/api";

export interface UpdateStoreRequest {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  settings?: Record<string, unknown>;
}

export const storeService = {
  getAll: async () => {
    const response = await api.get<ApiResponse<StoreResponse[]>>("/stores");
    return response.data.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<StoreResponse>>(`/stores/${id}`);
    return response.data.data;
  },

  update: async (id: string, data: UpdateStoreRequest) => {
    const response = await api.put<ApiResponse<StoreResponse>>(`/stores/${id}`, data);
    return response.data.data;
  },
};
