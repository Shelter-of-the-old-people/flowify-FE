export const HTTP_ERROR_MESSAGES = {
  400: "잘못된 요청입니다. 입력 값을 확인해 주세요.",
  401: "인증이 필요합니다. 다시 로그인해 주세요.",
  403: "접근 권한이 없습니다.",
  404: "요청한 데이터를 찾을 수 없습니다.",
  409: "중복되거나 충돌하는 요청입니다.",
  500: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  default: "요청 처리 중 오류가 발생했습니다.",
} as const;

export const API_ERROR_MESSAGES = {
  WORKFLOW_NOT_FOUND: "워크플로우를 찾을 수 없습니다.",
  WORKFLOW_ALREADY_ACTIVE: "이미 활성화된 워크플로우입니다.",
  NODE_NOT_FOUND: "노드를 찾을 수 없습니다.",
  INVALID_NODE_CONFIG: "노드 설정이 올바르지 않습니다.",
  EXECUTION_IN_PROGRESS: "이미 실행 중인 워크플로우입니다.",
  TOKEN_EXPIRED: "인증이 만료되었습니다. 다시 로그인해 주세요.",
  OAUTH_CONNECTION_FAILED: "서비스 연결에 실패했습니다.",
} as const;
