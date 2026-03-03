import api from "@/lib/api";
import type {
  ApiResponse,
  PaginatedResponse,
  InventoryResponse,
  AdjustInventoryRequest,
} from "@/types/api";

export interface InventoryMovementResponse {
  id: string;
  store_id: string;
  product_variant_id: string;
  type: string;
  quantity: number;
  previous_qty: number;
  new_qty: number;
  reference_type: string;
  reference_id: string | null;
  notes: string;
  created_by: string;
  created_at: string;
}

export interface BulkAdjustInventoryRequest {
  items: AdjustInventoryRequest[];
}

export const inventoryService = {
  getByVariant: async (variantId: string) => {
    const response = await api.get<ApiResponse<InventoryResponse>>(
      `/inventory/${variantId}`
    );
    return response.data.data;
  },

  adjust: async (data: AdjustInventoryRequest) => {
    const response = await api.post<ApiResponse<null>>("/inventory/adjust", data);
    return response.data;
  },

  bulkAdjust: async (data: BulkAdjustInventoryRequest) => {
    const response = await api.post<ApiResponse<null>>("/inventory/adjust/bulk", data);
    return response.data;
  },

  getLowStock: async (params?: Record<string, string | number | boolean>) => {
    const response = await api.get<PaginatedResponse<InventoryResponse>>(
      "/inventory/low-stock",
      { params }
    );
    return response.data;
  },

  getMovements: async (
    variantId: string,
    params?: Record<string, string | number | boolean>
  ) => {
    const response = await api.get<PaginatedResponse<InventoryMovementResponse>>(
      `/inventory/${variantId}/movements`,
      { params }
    );
    return response.data;
  },
};
