import { ApiError } from "@/shared/api/core";
import { getApiErrorMessage } from "@/shared/utils";

const callbackErrorMessages = {
  missingExchangeCode: "로그인 정보 확인이 필요합니다.",
  oauthFailed: "로그인 인증에 실패했습니다.",
  expiredExchangeCode: "로그인 정보가 만료되었습니다. 다시 시도해 주세요.",
  exchangeFailed: "로그인 처리 중 오류가 발생했습니다.",
} as const;

const callbackErrorCodeMessages = {
  oauth_failed: callbackErrorMessages.oauthFailed,
  exchange_code_expired: callbackErrorMessages.expiredExchangeCode,
  exchange_code_invalid: callbackErrorMessages.expiredExchangeCode,
} as const;

export const authCallbackFallbackMessage =
  callbackErrorMessages.exchangeFailed;

export const resolveRedirectError = (
  searchParams: URLSearchParams,
): string | null => {
  const message = searchParams.get("message");
  if (message) {
    return message;
  }

  const errorCode = searchParams.get("error");
  if (errorCode) {
    return (
      callbackErrorCodeMessages[
        errorCode as keyof typeof callbackErrorCodeMessages
      ] ?? callbackErrorMessages.exchangeFailed
    );
  }

  if (!searchParams.get("exchange_code")) {
    return callbackErrorMessages.missingExchangeCode;
  }

  return null;
};

export const resolveAuthExchangeError = (error: unknown) => {
  if (error instanceof ApiError && error.errorCode) {
    const mappedMessage =
      callbackErrorCodeMessages[
        error.errorCode as keyof typeof callbackErrorCodeMessages
      ];

    if (mappedMessage) {
      return mappedMessage;
    }
  }

  const resolvedMessage = getApiErrorMessage(error);
  return resolvedMessage || callbackErrorMessages.exchangeFailed;
};
