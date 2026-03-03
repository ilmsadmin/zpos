import api from "@/lib/api";
import type {
  ApiResponse,
  PaginatedResponse,
  StocktakeResponse,
  StocktakeItemResponse,
  CreateStocktakeRequest,
  AddStocktakeItemRequest,
  UpdateStocktakeItemRequest,
  AddStocktakeItemByBarcodeRequest,
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

  addItemByBarcode: async (id: string, data: AddStocktakeItemByBarcodeRequest) => {
    const response = await api.post<ApiResponse<StocktakeItemResponse>>(
      `/stocktakes/${id}/barcode`,
      data
    );
    return response.data.data;
  },

  updateItem: async (stocktakeId: string, itemId: string, data: UpdateStocktakeItemRequest) => {
    const response = await api.put<ApiResponse<StocktakeItemResponse>>(
      `/stocktakes/${stocktakeId}/items/${itemId}`,
      data
    );
    return response.data.data;
  },

  deleteItem: async (stocktakeId: string, itemId: string) => {
    await api.delete(`/stocktakes/${stocktakeId}/items/${itemId}`);
  },

  complete: async (id: string) => {
    const response = await api.post<ApiResponse<StocktakeResponse>>(
      `/stocktakes/${id}/complete`
    );
    return response.data.data;
  },

  cancel: async (id: string) => {
    const response = await api.post<ApiResponse<StocktakeResponse>>(
      `/stocktakes/${id}/cancel`
    );
    return response.data.data;
  },
};
