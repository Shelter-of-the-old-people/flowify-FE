import axios from "axios";
import { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  isRefreshTokenValid,
  shouldRefreshAccessToken,
  storeTokens,
} from "../libs/auth-session";

import { type TokenRefreshResponse, requestWithClient } from "./core";

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

export const publicApiClient = axios.create(apiClientConfig);
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

const clearSessionAndRedirect = () => {
  clearAuthSession();
  redirectToLogin();
};

const refreshAccessToken = async (refreshToken: string) => {
  const result = await requestWithClient<TokenRefreshResponse>(refreshClient, {
    url: "/auth/refresh",
    method: "POST",
    data: {
      refreshToken,
    },
  });

  storeTokens(result.accessToken, result.refreshToken);
  return result.accessToken;
};

const refreshAccessTokenWithQueue = async () => {
  const refreshToken = getRefreshToken();

  if (!refreshToken || !isRefreshTokenValid()) {
    clearSessionAndRedirect();
    throw new Error("Refresh token is missing or expired.");
  }

  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  try {
    const newAccessToken = await refreshAccessToken(refreshToken);
    processQueue(null, newAccessToken);
    return newAccessToken;
  } catch (refreshError) {
    processQueue(refreshError, null);
    clearSessionAndRedirect();
    throw refreshError;
  } finally {
    isRefreshing = false;
  }
};

export const apiClient = axios.create(apiClientConfig);

apiClient.interceptors.request.use(async (config) => {
  const token = shouldRefreshAccessToken()
    ? await refreshAccessTokenWithQueue()
    : getAccessToken();

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

    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshAccessTokenWithQueue();
      setAuthorizationHeader(originalRequest, newAccessToken);

      return apiClient(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);
