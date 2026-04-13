import { isAxiosError } from "axios";

import type { ApiResponse } from "../../types";

export class ApiError extends Error {
  public readonly errorCode: string | null;
  public readonly statusCode: number | null;
  public readonly isNetworkError: boolean;
  public override readonly cause?: unknown;

  constructor(params: {
    message: string;
    errorCode?: string | null;
    statusCode?: number | null;
    isNetworkError?: boolean;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.errorCode = params.errorCode ?? null;
    this.statusCode = params.statusCode ?? null;
    this.isNetworkError = params.isNetworkError ?? false;
    this.cause = params.cause;
  }
}

export const isCanceledRequestError = (error: unknown) =>
  isAxiosError(error) && error.code === "ERR_CANCELED";

export const normalizeApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) {
    return error;
  }

  if (isAxiosError<ApiResponse<unknown>>(error)) {
    const response = error.response;
    const data = response?.data;

    if (
      data &&
      typeof data === "object" &&
      "success" in data &&
      data.success === false
    ) {
      return new ApiError({
        message: data.message ?? "요청을 처리할 수 없습니다.",
        errorCode: data.errorCode ?? null,
        statusCode: response?.status ?? null,
        cause: error,
      });
    }

    if (!response) {
      return new ApiError({
        message: "네트워크 연결을 확인해주세요.",
        errorCode: "NETWORK_ERROR",
        isNetworkError: true,
        cause: error,
      });
    }

    return new ApiError({
      message: error.message,
      statusCode: response.status,
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new ApiError({
      message: error.message,
      cause: error,
    });
  }

  return new ApiError({
    message: "요청을 처리할 수 없습니다.",
    cause: error,
  });
};
