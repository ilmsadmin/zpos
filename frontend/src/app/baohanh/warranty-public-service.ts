import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

// Separate axios instance for public endpoints (no auth needed)
const publicApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface PublicWarrantyClaimResponse {
  claim_number: string;
  issue: string;
  status: string;
  resolution: string;
  received_date: string | null;
  completed_date: string | null;
  returned_date: string | null;
  created_at: string;
}

export interface PublicWarrantyResponse {
  warranty_code: string;
  serial_number: string;
  product_name: string;
  variant_name: string;
  customer_name: string;
  customer_phone: string;
  start_date: string;
  end_date: string;
  warranty_months: number;
  status: string;
  days_remaining: number;
  terms: string;
  claims?: PublicWarrantyClaimResponse[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const warrantyPublicService = {
  lookup: async (query: string): Promise<PublicWarrantyResponse[]> => {
    const response = await publicApi.get<ApiResponse<PublicWarrantyResponse[]>>(
      "/public/warranty/lookup",
      { params: { q: query } }
    );
    return response.data.data || [];
  },
};
