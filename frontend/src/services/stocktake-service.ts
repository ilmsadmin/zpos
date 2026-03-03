import api from "@/lib/api";
import type {
  ApiResponse,
  PaginatedResponse,
  StocktakeResponse,
  StocktakeItemResponse,
  CreateStocktakeRequest,
  AddStocktakeItemRequest,
} from "@/types/api";

export const stocktakeService = {
  list: async (params?: Record<string, string | number | boolean>) => {
    const response = await api.get<PaginatedResponse<StocktakeResponse>>(
      "/stocktakes",
      { params }
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<StocktakeResponse>>(
      `/stocktakes/${id}`
    );
    return response.data.data;
  },

  create: async (data: CreateStocktakeRequest) => {
    const response = await api.post<ApiResponse<StocktakeResponse>>(
      "/stocktakes",
      data
    );
    return response.data.data;
  },

  addItem: async (id: string, data: AddStocktakeItemRequest) => {
    const response = await api.post<ApiResponse<StocktakeItemResponse>>(
      `/stocktakes/${id}/count`,
      data
    );
    return response.data.data;
  },

  complete: async (id: string) => {
    const response = await api.post<ApiResponse<StocktakeResponse>>(
      `/stocktakes/${id}/complete`
    );
    return response.data.data;
  },
};
