import api from "@/lib/api";
import type {
  ApiResponse,
  CategoryResponse,
  CreateCategoryRequest,
} from "@/types/api";

export interface UpdateCategoryRequest {
  parent_id?: string;
  name?: string;
  description?: string;
  image_url?: string;
  sort_order?: number;
  is_active?: boolean;
}

export const categoryService = {
  getTree: async () => {
    const response = await api.get<ApiResponse<CategoryResponse[]>>("/categories");
    return response.data.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<CategoryResponse>>(`/categories/${id}`);
    return response.data.data;
  },

  create: async (data: CreateCategoryRequest) => {
    const response = await api.post<ApiResponse<CategoryResponse>>("/categories", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateCategoryRequest) => {
    const response = await api.put<ApiResponse<CategoryResponse>>(
      `/categories/${id}`,
      data
    );
    return response.data.data;
  },

  delete: async (id: string) => {
    await api.delete(`/categories/${id}`);
  },
};
