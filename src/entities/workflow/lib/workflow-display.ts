import { type DataType } from "@/entities/node";

export const WORKFLOW_DATA_TYPE_LABELS: Record<string, string> = {
  ARTICLE_LIST: "글 목록",
  API_RESPONSE: "API 응답",
  EMAIL_LIST: "이메일 목록",
  FILE_LIST: "여러 파일",
  SCHEDULE_DATA: "일정 데이터",
  SEND_RESULT: "전송 결과",
  SINGLE_EMAIL: "이메일",
  SINGLE_FILE: "파일",
  SPREADSHEET_DATA: "스프레드시트",
  TEXT: "텍스트",
  "api-response": "API 응답",
  "article-list": "글 목록",
  "email-list": "이메일 목록",
  "file-list": "여러 파일",
  "schedule-data": "일정 데이터",
  "send-result": "전송 결과",
  "single-email": "이메일",
  "single-file": "파일",
  spreadsheet: "스프레드시트",
  text: "텍스트",
};

export const WORKFLOW_FRONTEND_DATA_TYPE_LABELS: Record<DataType, string> = {
  "api-response": "API 응답",
  "article-list": "글 목록",
  "email-list": "이메일 목록",
  "file-list": "여러 파일",
  "schedule-data": "일정 데이터",
  "single-email": "이메일",
  "single-file": "파일",
  spreadsheet: "스프레드시트",
  text: "텍스트",
};

const TRIGGER_KIND_LABELS: Record<string, string> = {
  event: "새 항목 감지",
  manual: "직접 실행",
  polling: "주기적으로 확인",
  schedule: "예약 실행",
  webhook: "외부 요청으로 실행",
};

const EXECUTION_STATUS_LABELS: Record<string, string> = {
  canceled: "실행 취소",
  completed: "최근 실행 완료",
  failed: "실행 실패",
  running: "실행 중",
  skipped: "실행 건너뜀",
  success: "최근 실행 완료",
};

const NODE_DATA_REASON_LABELS: Record<string, string> = {
  DATA_EMPTY: "표시할 데이터가 없습니다.",
  EXECUTION_RUNNING: "워크플로우를 실행하는 중입니다.",
  NODE_FAILED: "이 단계 실행에 실패했습니다.",
  NODE_NOT_EXECUTED: "이 단계는 아직 실행되지 않았습니다.",
  NODE_SKIPPED: "이 단계는 실행 과정에서 건너뛰었습니다.",
  NO_EXECUTION: "아직 실행 기록이 없습니다.",
};

const SCHEMA_TYPE_LABELS: Record<string, string> = {
  API_RESPONSE: "API 응답",
  EMAIL: "이메일",
  EMAIL_LIST: "이메일 목록",
  FILE: "파일",
  FILE_LIST: "파일 목록",
  IMAGE: "이미지",
  OBJECT: "데이터 묶음",
  SCHEDULE: "일정",
  SPREADSHEET: "스프레드시트",
  TEXT: "텍스트",
  UNKNOWN: "데이터 구조 미정",
};

const SCHEMA_VALUE_TYPE_LABELS: Record<string, string> = {
  array: "목록",
  boolean: "참/거짓",
  date: "날짜",
  datetime: "날짜와 시간",
  file: "파일",
  number: "숫자",
  object: "데이터 묶음",
  string: "텍스트",
  text: "텍스트",
  url: "링크",
};

const METADATA_LABELS: Record<string, string> = {
  courseCount: "과목 수",
  lastEditedTime: "마지막 수정일",
  memberCount: "멤버 수",
  mimeType: "파일 형식",
  modifiedTime: "수정일",
  parentType: "상위 위치",
  size: "크기",
  term: "학기",
};

const normalizeKey = (value: string) => value.trim();

const getCaseInsensitiveLabel = (
  labels: Record<string, string>,
  value: string | null | undefined,
) => {
  if (!value) {
    return null;
  }

  const normalizedValue = normalizeKey(value);
  if (normalizedValue.length === 0) {
    return null;
  }

  return (
    labels[normalizedValue] ??
    labels[normalizedValue.toUpperCase()] ??
    labels[normalizedValue.toLowerCase()] ??
    null
  );
};

export const getDataTypeDisplayLabel = (
  value: string | null | undefined,
): string | null => getCaseInsensitiveLabel(WORKFLOW_DATA_TYPE_LABELS, value);

export const getCanonicalInputTypeLabel = (
  value: string | null | undefined,
): string | null => getDataTypeDisplayLabel(value);

export const getTriggerKindLabel = (
  value: string | null | undefined,
): string | null => getCaseInsensitiveLabel(TRIGGER_KIND_LABELS, value);

export const getExecutionStatusLabel = (
  value: string | null | undefined,
): string | null => getCaseInsensitiveLabel(EXECUTION_STATUS_LABELS, value);

export const getNodeDataReasonLabel = (
  value: string | null | undefined,
): string | null => getCaseInsensitiveLabel(NODE_DATA_REASON_LABELS, value);

export const getSchemaTypeLabel = (
  value: string | null | undefined,
): string | null => getCaseInsensitiveLabel(SCHEMA_TYPE_LABELS, value);

export const getSchemaValueTypeLabel = (
  value: string | null | undefined,
): string | null => getCaseInsensitiveLabel(SCHEMA_VALUE_TYPE_LABELS, value);

export const isSuccessfulExecutionStatus = (
  value: string | null | undefined,
) => {
  const normalizedValue = value?.trim().toLowerCase();

  return normalizedValue === "success" || normalizedValue === "completed";
};

const formatDateTime = (value: string) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
};

const formatFileSize = (value: string | number) => {
  const numericValue =
    typeof value === "number" ? value : Number.parseInt(value, 10);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return String(value);
  }

  if (numericValue < 1024) {
    return `${numericValue} B`;
  }

  if (numericValue < 1024 * 1024) {
    return `${(numericValue / 1024).toFixed(1)} KB`;
  }

  return `${(numericValue / (1024 * 1024)).toFixed(1)} MB`;
};

const formatMetadataValue = (key: string, value: unknown) => {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  if (key === "size") {
    return formatFileSize(value);
  }

  if (key === "modifiedTime" || key === "lastEditedTime") {
    return formatDateTime(String(value));
  }

  return String(value);
};

export const getWorkflowMetadataSummary = (
  metadata: Record<string, unknown> | undefined,
) => {
  if (!metadata) {
    return "";
  }

  return Object.entries(METADATA_LABELS)
    .map(([key, label]) => {
      const value = formatMetadataValue(key, metadata[key]);

      return value ? `${label}: ${value}` : null;
    })
    .filter((value): value is string => value !== null)
    .join(" · ");
};
