import { isAxiosError } from "axios";

import { API_ERROR_MESSAGES, HTTP_ERROR_MESSAGES } from "../../constants";
import type { ApiResponse, ErrorResponse } from "../../types";

export class ApiError extends Error {
  public readonly errorCode: string;

  constructor(errorResponse: ErrorResponse) {
    super(errorResponse.message);
    this.name = "ApiError";
    this.errorCode = errorResponse.errorCode;
  }
}

export const getApiErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    const mapped =
      API_ERROR_MESSAGES[error.errorCode as keyof typeof API_ERROR_MESSAGES];

    return mapped ?? error.message;
  }

  if (isAxiosError(error)) {
    const status = error.response?.status as keyof typeof HTTP_ERROR_MESSAGES;

    return HTTP_ERROR_MESSAGES[status] ?? HTTP_ERROR_MESSAGES.default;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return HTTP_ERROR_MESSAGES.default;
};

export const processApiResponse = <T>(response: ApiResponse<T>): T => {
  if (response.success) {
    return response.data;
  }

  throw new ApiError(response);
};
