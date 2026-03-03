import api from "@/lib/api";
import type {
  ApiResponse,
  PaginatedResponse,
  ProductResponse,
  CreateProductRequest,
  UpdateProductRequest,
  CreateVariantRequest,
  UpdateVariantRequest,
  VariantResponse,
} from "@/types/api";

export const productService = {
  list: async (params?: Record<string, string | number | boolean>) => {
    const response = await api.get<PaginatedResponse<ProductResponse>>("/products", {
      params,
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<ProductResponse>>(`/products/${id}`);
    return response.data.data;
  },

  create: async (data: CreateProductRequest) => {
    const response = await api.post<ApiResponse<ProductResponse>>("/products", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateProductRequest) => {
    const response = await api.put<ApiResponse<ProductResponse>>(`/products/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string) => {
    await api.delete(`/products/${id}`);
  },

  search: async (query: string, limit = 10) => {
    const response = await api.get<ApiResponse<ProductResponse[]>>("/products/search", {
      params: { q: query, limit },
    });
    return response.data.data;
  },

  getByBarcode: async (barcode: string) => {
    const response = await api.get<ApiResponse<ProductResponse>>(
      `/products/barcode/${barcode}`
    );
    return response.data.data;
  },

  // Variant operations
  createVariant: async (productId: string, data: CreateVariantRequest) => {
    const response = await api.post<ApiResponse<VariantResponse>>(
      `/products/${productId}/variants`,
      data
    );
    return response.data.data;
  },

  updateVariant: async (
    productId: string,
    variantId: string,
    data: UpdateVariantRequest
  ) => {
    const response = await api.put<ApiResponse<VariantResponse>>(
      `/products/${productId}/variants/${variantId}`,
      data
    );
    return response.data.data;
  },

  deleteVariant: async (productId: string, variantId: string) => {
    await api.delete(`/products/${productId}/variants/${variantId}`);
  },
};
