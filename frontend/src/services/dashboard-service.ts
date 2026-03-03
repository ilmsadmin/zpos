import api from "@/lib/api";
import type {
  ApiResponse,
  DashboardSummary,
  SalesChartPoint,
  TopProductItem,
} from "@/types/api";

export const dashboardService = {
  getSummary: async () => {
    const response = await api.get<ApiResponse<DashboardSummary>>(
      "/dashboard/summary"
    );
    return response.data.data;
  },

  getSalesChart: async (days = 7, period = "day") => {
    const response = await api.get<ApiResponse<SalesChartPoint[]>>(
      "/dashboard/sales-chart",
      { params: { days, period } }
    );
    return response.data.data;
  },

  getTopProducts: async (limit = 10) => {
    const response = await api.get<ApiResponse<TopProductItem[]>>(
      "/dashboard/top-products",
      { params: { limit } }
    );
    return response.data.data;
  },
};
