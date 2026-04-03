import type { ApiResponse } from "../types";

import { apiClient } from "./client";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  getGoogleLoginUrl: () => apiClient.get<ApiResponse<string>>("/auth/google"),

  googleCallback: (code: string) =>
    apiClient.get<ApiResponse<LoginResponse>>(
      `/auth/google/callback?code=${encodeURIComponent(code)}`,
    ),

  refresh: (refreshToken: string) =>
    apiClient.post<ApiResponse<RefreshTokenResponse>>("/auth/refresh", {
      refreshToken,
    }),

  logout: () => apiClient.post<ApiResponse<void>>("/auth/logout"),
};
