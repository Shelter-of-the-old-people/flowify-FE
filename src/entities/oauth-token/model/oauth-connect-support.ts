export const OAUTH_CONNECT_SUPPORTED_SERVICES = [
  "slack",
  "google_drive",
  "notion",
  "github",
  "canvas_lms",
] as const;

export const isOAuthConnectSupported = (serviceKey: string) =>
  OAUTH_CONNECT_SUPPORTED_SERVICES.includes(
    serviceKey as (typeof OAUTH_CONNECT_SUPPORTED_SERVICES)[number],
  );

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
      label: "인증 확인 중",
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
      label: "인증 완료",
      description: "연결된 계정으로 사용할 수 있습니다.",
      badgeLabel: "CONNECTED",
      actionLabel: "연결 해제",
      canStartConnect: false,
      selectionDisabled: false,
      tone: "success",
    };
  }

  const connectSupported = isOAuthConnectSupported(serviceKey);

  if (isAuthStatusError) {
    return {
      key: "check_needed",
      label: "상태 확인 필요",
      description: connectSupported
        ? "연결 상태를 확인하지 못했습니다. 다시 연결을 시작할 수 있습니다."
        : "연결 상태를 확인하지 못했고, 아직 이 서비스 연결은 지원 전입니다.",
      badgeLabel: "CHECK NEEDED",
      actionLabel: connectSupported ? "연결 시작" : "준비 중",
      canStartConnect: connectSupported,
      selectionDisabled: !connectSupported,
      tone: "warning",
    };
  }

  if (!connectSupported) {
    return {
      key: "unsupported",
      label: "연동 준비 중",
      description: "아직 이 서비스의 OAuth 연결은 지원 전입니다.",
      badgeLabel: "NOT SUPPORTED",
      actionLabel: "준비 중",
      canStartConnect: false,
      selectionDisabled: true,
      tone: "warning",
    };
  }

  return {
    key: "connectable",
    label: "인증 필요",
    description: "연결을 시작하면 이 서비스를 사용할 수 있습니다.",
    badgeLabel: "DISCONNECTED",
    actionLabel: "연결 시작",
    canStartConnect: true,
    selectionDisabled: false,
    tone: "neutral",
  };
};
