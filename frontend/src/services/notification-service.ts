import api from "@/lib/api";
import type {
  ApiResponse,
  PaginatedResponse,
  NotificationResponse,
  NotificationPreferences,
} from "@/types/api";

export const notificationService = {
  list: async (params?: Record<string, string | number | boolean>) => {
    const response = await api.get<PaginatedResponse<NotificationResponse>>(
      "/notifications",
      { params }
    );
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get<
      ApiResponse<{ unread_count: number }>
    >("/notifications/unread-count");
    return response.data.data.unread_count;
  },

  markAsRead: async (id: string) => {
    const response = await api.put<ApiResponse<null>>(
      `/notifications/${id}/read`
    );
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.put<ApiResponse<null>>(
      "/notifications/read-all"
    );
    return response.data;
  },

  getPreferences: async () => {
    const response = await api.get<ApiResponse<NotificationPreferences>>(
      "/notifications/preferences"
    );
    return response.data.data;
  },

  savePreferences: async (preferences: NotificationPreferences) => {
    const response = await api.put<ApiResponse<NotificationPreferences>>(
      "/notifications/preferences",
      { preferences }
    );
    return response.data.data;
  },
};
