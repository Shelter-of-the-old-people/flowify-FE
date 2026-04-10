import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";

import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  storeAuthUser,
  storeTokens,
} from "../libs/auth-session";
import type { ApiResponse } from "../types";

import type { LoginResponse } from "./auth.api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const LOGIN_PATH = "/login";

const apiClientConfig = {
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
  },
};

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const refreshClient = axios.create(apiClientConfig);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const redirectToLogin = () => {
  window.location.href = LOGIN_PATH;
};

const setAuthorizationHeader = (
  config: RetryableRequestConfig,
  token: string,
) => {
  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${token}`;
};

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((request) => {
    if (token) {
      request.resolve(token);
      return;
    }

    request.reject(error);
  });

  failedQueue = [];
};

const refreshAccessToken = async (refreshToken: string) => {
  const { data } = await refreshClient.post<ApiResponse<LoginResponse>>(
    "/auth/refresh",
    {
      refreshToken,
    },
  );

  storeTokens(data.data.accessToken, data.data.refreshToken);
  storeAuthUser(data.data.user);
  return data.data.accessToken;
};

export const apiClient = axios.create(apiClientConfig);

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const isUnauthorized = error.response?.status === 401;
    const isRefreshRequest = originalRequest?.url?.includes("/auth/refresh");

    if (
      !originalRequest ||
      !isUnauthorized ||
      originalRequest._retry ||
      isRefreshRequest
    ) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearAuthSession();
      redirectToLogin();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        setAuthorizationHeader(originalRequest, token);
        return apiClient(originalRequest);
      });
    }

    isRefreshing = true;

    try {
      const newAccessToken = await refreshAccessToken(refreshToken);

      processQueue(null, newAccessToken);
      setAuthorizationHeader(originalRequest, newAccessToken);

      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearAuthSession();
      redirectToLogin();

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
