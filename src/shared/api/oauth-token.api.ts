import type { ApiResponse } from "../types";

import { apiClient } from "./client";

export interface OAuthTokenSummary {
  service: string;
  connected: boolean;
  accountEmail: string | null;
  expiresAt: string | null;
}

export interface OAuthConnectResponse {
  authUrl: string;
}

export const oauthApi = {
  getTokens: () =>
    apiClient.get<ApiResponse<OAuthTokenSummary[]>>("/oauth-tokens"),

  connect: (service: string) =>
    apiClient.post<ApiResponse<OAuthConnectResponse>>(
      `/oauth-tokens/${service}/connect`,
    ),

  disconnect: (service: string) =>
    apiClient.delete<ApiResponse<void>>(`/oauth-tokens/${service}`),
};
