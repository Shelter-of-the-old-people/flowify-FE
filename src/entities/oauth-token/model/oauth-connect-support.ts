export const OAUTH_CONNECT_SUPPORTED_SERVICES = [
  "slack",
  "gmail",
  "google_drive",
] as const;

export const MANUAL_TOKEN_SUPPORTED_SERVICES = [
  "notion",
  "github",
  "canvas_lms",
] as const;

export type OAuthSupportedService =
  (typeof OAUTH_CONNECT_SUPPORTED_SERVICES)[number];

export type ManualTokenSupportedService =
  (typeof MANUAL_TOKEN_SUPPORTED_SERVICES)[number];

export type ServiceConnectionKind =
  | "oauth_redirect"
  | "manual_token"
  | "unsupported";

export const isOAuthConnectSupported = (serviceKey: string) =>
  OAUTH_CONNECT_SUPPORTED_SERVICES.includes(
    serviceKey as OAuthSupportedService,
  );

export const isManualTokenSupported = (serviceKey: string) =>
  MANUAL_TOKEN_SUPPORTED_SERVICES.includes(
    serviceKey as ManualTokenSupportedService,
  );

export const getServiceConnectionKind = (
  serviceKey: string,
): ServiceConnectionKind => {
  if (isOAuthConnectSupported(serviceKey)) {
    return "oauth_redirect";
  }

  if (isManualTokenSupported(serviceKey)) {
    return "manual_token";
  }

  return "unsupported";
};

export type OAuthConnectionStateKey =
  | "not_required"
  | "checking"
  | "connected"
  | "check_needed"
  | "connectable"
  | "unsupported";

export type OAuthConnectionTone = "success" | "warning" | "neutral" | "error";

export interface OAuthConnectionUiState {
  key: OAuthConnectionStateKey;
  label: string;
  description: string;
  badgeLabel: string;
  actionLabel: string;
  canStartConnect: boolean;
  selectionDisabled: boolean;
  tone: OAuthConnectionTone;
}

interface OAuthConnectionUiStateParameters {
  authRequired: boolean;
  connected: boolean;
  isAuthStatusError?: boolean;
  isAuthStatusLoading?: boolean;
  serviceKey: string;
}

export const getOAuthConnectionUiState = ({
  authRequired,
  connected,
  isAuthStatusError = false,
  isAuthStatusLoading = false,
  serviceKey,
}: OAuthConnectionUiStateParameters): OAuthConnectionUiState => {
  if (!authRequired) {
    return {
      key: "not_required",
      label: "바로 사용",
      description: "별도 계정 연결 없이 사용할 수 있습니다.",
      badgeLabel: "READY",
      actionLabel: "",
      canStartConnect: false,
      selectionDisabled: false,
      tone: "neutral",
    };
  }

  if (isAuthStatusLoading) {
    return {
      key: "checking",
      label: "연결 확인 중",
      description: "연결 상태를 확인하는 중입니다.",
      badgeLabel: "CHECKING",
      actionLabel: "확인 중",
      canStartConnect: false,
      selectionDisabled: true,
      tone: "neutral",
    };
  }

  if (connected) {
    return {
      key: "connected",
      label: "연결 완료",
      description: "연결된 계정으로 바로 사용할 수 있습니다.",
      badgeLabel: "CONNECTED",
      actionLabel: "연결 해제",
      canStartConnect: false,
      selectionDisabled: false,
      tone: "success",
    };
  }

  const connectionKind = getServiceConnectionKind(serviceKey);

  if (isAuthStatusError) {
    if (connectionKind === "manual_token") {
      return {
        key: "check_needed",
        label: "상태 확인 필요",
        description:
          "연결 상태를 확인하지 못했습니다. 설정 화면에서 토큰을 다시 저장해 주세요.",
        badgeLabel: "CHECK NEEDED",
        actionLabel: "설정 화면으로 이동",
        canStartConnect: true,
        selectionDisabled: false,
        tone: "warning",
      };
    }

    if (connectionKind === "oauth_redirect") {
      return {
        key: "check_needed",
        label: "상태 확인 필요",
        description:
          "연결 상태를 확인하지 못했습니다. 다시 연결을 시작할 수 있습니다.",
        badgeLabel: "CHECK NEEDED",
        actionLabel: "연결 시작",
        canStartConnect: true,
        selectionDisabled: false,
        tone: "warning",
      };
    }

    return {
      key: "unsupported",
      label: "연동 준비 중",
      description: "아직 이 서비스의 연결 방식이 준비 중입니다.",
      badgeLabel: "NOT SUPPORTED",
      actionLabel: "준비 중",
      canStartConnect: false,
      selectionDisabled: true,
      tone: "warning",
    };
  }

  if (connectionKind === "manual_token") {
    return {
      key: "connectable",
      label: "토큰 입력 필요",
      description: "설정 화면에서 토큰을 직접 입력해 연결합니다.",
      badgeLabel: "TOKEN REQUIRED",
      actionLabel: "설정 화면으로 이동",
      canStartConnect: true,
      selectionDisabled: false,
      tone: "neutral",
    };
  }

  if (connectionKind === "unsupported") {
    return {
      key: "unsupported",
      label: "연동 준비 중",
      description: "아직 이 서비스의 연결 방식이 준비 중입니다.",
      badgeLabel: "NOT SUPPORTED",
      actionLabel: "준비 중",
      canStartConnect: false,
      selectionDisabled: true,
      tone: "warning",
    };
  }

  return {
    key: "connectable",
    label: "연결 필요",
    description: "연결을 시작하면 이 서비스를 사용할 수 있습니다.",
    badgeLabel: "DISCONNECTED",
    actionLabel: "연결 시작",
    canStartConnect: true,
    selectionDisabled: false,
    tone: "neutral",
  };
};
