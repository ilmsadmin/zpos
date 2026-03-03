import api from "@/lib/api";
import type {
  ApiResponse,
  POSSessionResponse,
} from "@/types/api";

export interface OpenPOSSessionRequest {
  opening_amount: number;
  notes?: string;
}

export interface ClosePOSSessionRequest {
  closing_amount: number;
  notes?: string;
}

export const posSessionService = {
  open: async (data: OpenPOSSessionRequest) => {
    const response = await api.post<ApiResponse<POSSessionResponse>>(
      "/pos/sessions/open",
      data
    );
    return response.data.data;
  },

  close: async (sessionId: string, data: ClosePOSSessionRequest) => {
    const response = await api.post<ApiResponse<POSSessionResponse>>(
      `/pos/sessions/${sessionId}/close`,
      data
    );
    return response.data.data;
  },

  getCurrent: async () => {
    const response = await api.get<ApiResponse<POSSessionResponse>>(
      "/pos/sessions/current"
    );
    return response.data.data;
  },

  list: async (params?: Record<string, string | number | boolean>) => {
    const response = await api.get<ApiResponse<POSSessionResponse[]>>(
      "/pos/sessions",
      { params }
    );
    return response.data.data;
  },
};
