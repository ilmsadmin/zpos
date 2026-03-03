import api from "@/lib/api";
import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UserResponse,
  RefreshTokenRequest,
  ChangePasswordRequest,
} from "@/types/api";

export const authService = {
  login: async (data: LoginRequest) => {
    const response = await api.post<ApiResponse<LoginResponse>>("/auth/login", data);
    return response.data.data;
  },

  register: async (data: RegisterRequest) => {
    const response = await api.post<ApiResponse<UserResponse>>("/auth/register", data);
    return response.data.data;
  },

  refreshToken: async (data: RefreshTokenRequest) => {
    const response = await api.post<ApiResponse<LoginResponse>>("/auth/refresh", data);
    return response.data.data;
  },

  changePassword: async (data: ChangePasswordRequest) => {
    const response = await api.post<ApiResponse<null>>("/auth/change-password", data);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get<ApiResponse<UserResponse>>("/auth/profile");
    return response.data.data;
  },

  logout: async () => {
    const response = await api.post<ApiResponse<null>>("/auth/logout");
    return response.data;
  },
};
