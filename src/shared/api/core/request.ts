import type { AxiosInstance, AxiosRequestConfig } from "axios";

import type { ApiResponse } from "../../types";
import { apiClient } from "../client";

import {
  ApiError,
  isCanceledRequestError,
  normalizeApiError,
} from "./api-error";

const toBusinessApiError = (response: {
  message: string | null;
  errorCode: string | null;
}) =>
  new ApiError({
    message: response.message ?? "요청을 처리할 수 없습니다.",
    errorCode: response.errorCode,
  });

export const unwrapApiResponse = <T>(response: ApiResponse<T>): T => {
  if (response.success) {
    return response.data;
  }

  throw toBusinessApiError(response);
};

export const requestWithClient = async <T>(
  client: AxiosInstance,
  config: AxiosRequestConfig,
): Promise<T> => {
  try {
    const { data } = await client.request<ApiResponse<T>>(config);
    return unwrapApiResponse(data);
  } catch (error) {
    if (isCanceledRequestError(error)) {
      throw error;
    }

    throw normalizeApiError(error);
  }
};

export const request = <T>(config: AxiosRequestConfig) =>
  requestWithClient<T>(apiClient, config);
