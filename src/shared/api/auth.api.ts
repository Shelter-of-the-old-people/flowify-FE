import type { ApiResponse } from "../types";

import { apiClient } from "./client";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export const authApi = {
  googleCallback: (code: string) =>
    apiClient.get<ApiResponse<LoginResponse>>(
      `/auth/google/callback?code=${encodeURIComponent(code)}`,
    ),

  refresh: (refreshToken: string) =>
    apiClient.post<ApiResponse<LoginResponse>>("/auth/refresh", {
      refreshToken,
    }),

  logout: () => apiClient.post<ApiResponse<void>>("/auth/logout"),
};
