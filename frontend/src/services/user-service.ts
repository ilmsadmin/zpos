import api from "@/lib/api";
import type {
  ApiResponse,
  UserResponse,
  CreateUserRequest,
  UpdateUserRequest,
  RoleResponse,
  PaginatedResponse,
} from "@/types/api";

export interface CreateRoleRequest {
  name: string;
  display_name: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  display_name?: string;
  description?: string;
  permissions?: string[];
}

export const userService = {
  list: async (params?: Record<string, string | number | boolean>) => {
    const response = await api.get<PaginatedResponse<UserResponse>>("/users", {
      params,
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<UserResponse>>(`/users/${id}`);
    return response.data.data;
  },

  create: async (data: CreateUserRequest) => {
    const response = await api.post<ApiResponse<UserResponse>>("/users", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateUserRequest) => {
    const response = await api.put<ApiResponse<UserResponse>>(`/users/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string) => {
    await api.delete(`/users/${id}`);
  },
};

export const roleService = {
  list: async () => {
    const response = await api.get<ApiResponse<RoleResponse[]>>("/roles");
    return response.data.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<RoleResponse>>(`/roles/${id}`);
    return response.data.data;
  },

  create: async (data: CreateRoleRequest) => {
    const response = await api.post<ApiResponse<RoleResponse>>("/roles", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateRoleRequest) => {
    const response = await api.put<ApiResponse<RoleResponse>>(`/roles/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string) => {
    await api.delete(`/roles/${id}`);
  },
};
