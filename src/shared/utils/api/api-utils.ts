import { isAxiosError } from "axios";

import { ApiError } from "../../api/core";
import { API_ERROR_MESSAGES, HTTP_ERROR_MESSAGES } from "../../constants";
import type { ApiResponse } from "../../types";

export const getApiErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.errorCode) {
      const mapped =
        API_ERROR_MESSAGES[error.errorCode as keyof typeof API_ERROR_MESSAGES];
      if (mapped) {
        return mapped;
      }
    }

    if (error.statusCode) {
      const httpMessage =
        HTTP_ERROR_MESSAGES[
          error.statusCode as keyof typeof HTTP_ERROR_MESSAGES
        ];
      if (httpMessage) {
        return httpMessage;
      }
    }

    return error.message;
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

  throw new ApiError({
    message: response.message,
    errorCode: response.errorCode,
  });
};
