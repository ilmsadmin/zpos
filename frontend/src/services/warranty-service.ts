import api from "@/lib/api";
import type {
  ApiResponse,
  PaginatedResponse,
  WarrantyResponse,
  WarrantyClaimResponse,
  CreateWarrantyRequest,
  UpdateWarrantyRequest,
} from "@/types/api";

export interface CreateWarrantyClaimRequest {
  issue: string;
  description?: string;
  images?: string[];
}

export interface UpdateWarrantyClaimRequest {
  status?: "pending" | "received" | "processing" | "completed" | "rejected" | "returned";
  resolution?: string;
  technician_notes?: string;
}

export const warrantyService = {
  list: async (params?: Record<string, string | number | boolean>) => {
    const response = await api.get<PaginatedResponse<WarrantyResponse>>("/warranties", {
      params,
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<WarrantyResponse>>(`/warranties/${id}`);
    return response.data.data;
  },

  create: async (data: CreateWarrantyRequest) => {
    const response = await api.post<ApiResponse<WarrantyResponse>>("/warranties", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateWarrantyRequest) => {
    const response = await api.put<ApiResponse<WarrantyResponse>>(`/warranties/${id}`, data);
    return response.data.data;
  },

  void: async (id: string) => {
    const response = await api.post<ApiResponse<null>>(`/warranties/${id}/void`);
    return response.data;
  },

  lookup: async (query: string) => {
    const response = await api.get<ApiResponse<WarrantyResponse[]>>("/warranties/lookup", {
      params: { q: query },
    });
    return response.data.data;
  },

  getExpiring: async (params?: Record<string, string | number>) => {
    const response = await api.get<PaginatedResponse<WarrantyResponse>>("/warranties/expiring", {
      params,
    });
    return response.data;
  },

  getActiveClaimsCount: async () => {
    const response = await api.get<ApiResponse<{ active_claims: number }>>("/warranties/claims-count");
    return response.data.data.active_claims;
  },

  createClaim: async (warrantyId: string, data: CreateWarrantyClaimRequest) => {
    const response = await api.post<ApiResponse<WarrantyClaimResponse>>(
      `/warranties/${warrantyId}/claims`,
      data
    );
    return response.data.data;
  },

  getClaimById: async (claimId: string) => {
    const response = await api.get<ApiResponse<WarrantyClaimResponse>>(
      `/warranty-claims/${claimId}`
    );
    return response.data.data;
  },

  updateClaim: async (claimId: string, data: UpdateWarrantyClaimRequest) => {
    const response = await api.put<ApiResponse<WarrantyClaimResponse>>(
      `/warranty-claims/${claimId}`,
      data
    );
    return response.data.data;
  },

  updateClaimStatus: async (claimId: string, status: string) => {
    const response = await api.put<ApiResponse<WarrantyClaimResponse>>(
      `/warranty-claims/${claimId}/status`,
      { status }
    );
    return response.data.data;
  },

  returnClaim: async (claimId: string, notes?: string) => {
    const response = await api.post<ApiResponse<WarrantyClaimResponse>>(
      `/warranty-claims/${claimId}/return`,
      { notes }
    );
    return response.data.data;
  },
};
