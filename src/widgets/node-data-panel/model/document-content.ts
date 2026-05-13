type DataRecord = Record<string, unknown>;

export type DocumentContentStatus =
  | "available"
  | "empty"
  | "unsupported"
  | "too_large"
  | "failed"
  | "not_requested";

export type DocumentContentKind =
  | "plain_text"
  | "table_text"
  | "slide_text"
  | "ocr_text"
  | "image_description"
  | "mixed"
  | "none";

export type DocumentContentMetadata = {
  extractionMethod: string | null;
  contentKind: DocumentContentKind | string | null;
  truncated: boolean;
  charCount: number | null;
  originalCharCount: number | null;
  storedContentTruncated: boolean;
  storedCharCount: number | null;
  limits: {
    maxDownloadBytes: number | null;
    maxExtractedChars: number | null;
    maxLlmInputChars: number | null;
  };
};

export type PreviewContentPolicy =
  | "metadata_only"
  | "content_included"
  | "content_status_only"
  | "required_by_downstream"
  | "content_required_but_unavailable";

export type PreviewContentMetadata = {
  contentIncluded: boolean | null;
  contentPolicy: PreviewContentPolicy | string | null;
  contentRequired: boolean | null;
  contentRequiredReason: string | null;
  contentStatusScope: string | null;
  previewScope: string | null;
};

const DOCUMENT_CONTENT_STATUSES = new Set<string>([
  "available",
  "empty",
  "unsupported",
  "too_large",
  "failed",
  "not_requested",
]);

const DOCUMENT_CONTENT_PROBLEM_STATUSES = new Set<DocumentContentStatus>([
  "empty",
  "unsupported",
  "too_large",
  "failed",
]);

const isRecord = (value: unknown): value is DataRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getNestedRecord = (record: DataRecord, ...keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (isRecord(value)) {
      return value;
    }
  }

  return null;
};

const getString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : "";

const getBoolean = (value: unknown) =>
  typeof value === "boolean" ? value : null;

const getNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const stringValue = getString(value);
  if (!stringValue) {
    return null;
  }

  const numberValue = Number(stringValue);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const getFirstString = (record: DataRecord, keys: readonly string[]) => {
  for (const key of keys) {
    const value = getString(record[key]);
    if (value) {
      return value;
    }
  }

  return "";
};

const getFirstBoolean = (record: DataRecord, keys: readonly string[]) => {
  for (const key of keys) {
    const value = getBoolean(record[key]);
    if (value !== null) {
      return value;
    }
  }

  return false;
};

const getFirstNumber = (record: DataRecord, keys: readonly string[]) => {
  for (const key of keys) {
    const value = getNumber(record[key]);
    if (value !== null) {
      return value;
    }
  }

  return null;
};

export const getDocumentContentStatus = (
  value: unknown,
): DocumentContentStatus | null => {
  if (!isRecord(value)) {
    return null;
  }

  const status = getFirstString(value, ["content_status", "contentStatus"]);
  return DOCUMENT_CONTENT_STATUSES.has(status)
    ? (status as DocumentContentStatus)
    : null;
};

export const getDocumentContentError = (value: unknown) => {
  if (!isRecord(value)) {
    return "";
  }

  return getFirstString(value, ["content_error", "contentError"]);
};

export const getDocumentContentText = (value: unknown) => {
  if (!isRecord(value)) {
    return "";
  }

  return getFirstString(value, ["content", "extracted_text", "extractedText"]);
};

export const getDocumentContentMetadata = (
  value: unknown,
): DocumentContentMetadata => {
  const metadata = isRecord(value)
    ? (getNestedRecord(value, "content_metadata", "contentMetadata") ?? {})
    : {};
  const limits = getNestedRecord(metadata, "limits") ?? {};

  return {
    extractionMethod:
      getFirstString(metadata, ["extraction_method", "extractionMethod"]) ||
      null,
    contentKind:
      getFirstString(metadata, ["content_kind", "contentKind"]) || null,
    truncated: getFirstBoolean(metadata, ["truncated"]),
    charCount: getFirstNumber(metadata, ["char_count", "charCount"]),
    originalCharCount: getFirstNumber(metadata, [
      "original_char_count",
      "originalCharCount",
    ]),
    storedContentTruncated: getFirstBoolean(metadata, [
      "stored_content_truncated",
      "storedContentTruncated",
    ]),
    storedCharCount: getFirstNumber(metadata, [
      "stored_char_count",
      "storedCharCount",
    ]),
    limits: {
      maxDownloadBytes: getFirstNumber(limits, [
        "max_download_bytes",
        "maxDownloadBytes",
      ]),
      maxExtractedChars: getFirstNumber(limits, [
        "max_extracted_chars",
        "maxExtractedChars",
      ]),
      maxLlmInputChars: getFirstNumber(limits, [
        "max_llm_input_chars",
        "maxLlmInputChars",
      ]),
    },
  };
};

export const getDocumentContentStatusLabel = (
  status: DocumentContentStatus | null,
) => {
  switch (status) {
    case "available":
      return "본문 읽기 완료";
    case "empty":
      return "읽을 수 있는 본문 없음";
    case "unsupported":
      return "지원하지 않는 파일 형식";
    case "too_large":
      return "파일 크기 제한 초과";
    case "failed":
      return "본문 읽기 실패";
    case "not_requested":
      return "본문 미포함";
    default:
      return "";
  }
};

export const getDocumentContentStatusDescription = ({
  error,
  metadata,
  status,
}: {
  error?: string;
  metadata: DocumentContentMetadata;
  status: DocumentContentStatus | null;
}) => {
  if (error) {
    return error;
  }

  if (status === "too_large") {
    return "현재 처리 가능한 크기를 초과했습니다.";
  }

  if (metadata.storedContentTruncated) {
    return "실행 로그에는 일부 본문만 저장되었습니다.";
  }

  if (metadata.truncated) {
    return "본문 일부만 표시됩니다.";
  }

  return "";
};

export const isDocumentContentProblem = (
  status: DocumentContentStatus | null,
) => Boolean(status && DOCUMENT_CONTENT_PROBLEM_STATUSES.has(status));

export const isDocumentContentUnavailableForSummary = (
  status: DocumentContentStatus | null,
) =>
  Boolean(
    status &&
    ["empty", "unsupported", "too_large", "failed", "not_requested"].includes(
      status,
    ),
  );

export const getPreviewContentMetadata = (
  metadata: unknown,
): PreviewContentMetadata => {
  if (!isRecord(metadata)) {
    return {
      contentIncluded: null,
      contentPolicy: null,
      contentRequired: null,
      contentRequiredReason: null,
      contentStatusScope: null,
      previewScope: null,
    };
  }

  return {
    contentIncluded:
      getBoolean(metadata.contentIncluded) ??
      getBoolean(metadata.content_included),
    contentPolicy:
      getFirstString(metadata, ["contentPolicy", "content_policy"]) || null,
    contentRequired:
      getBoolean(metadata.contentRequired) ??
      getBoolean(metadata.content_required),
    contentRequiredReason:
      getFirstString(metadata, [
        "contentRequiredReason",
        "content_required_reason",
      ]) || null,
    contentStatusScope:
      getFirstString(metadata, [
        "contentStatusScope",
        "content_status_scope",
      ]) || null,
    previewScope:
      getFirstString(metadata, ["previewScope", "preview_scope"]) || null,
  };
};

export const getPreviewContentPolicyLabel = (
  policy: PreviewContentPolicy | string | null,
) => {
  switch (policy) {
    case "metadata_only":
      return "본문 미포함 미리보기";
    case "content_included":
      return "본문 포함 미리보기";
    case "content_status_only":
      return "본문 상태만 포함된 미리보기";
    case "required_by_downstream":
      return "다음 단계에서 본문 필요";
    case "content_required_but_unavailable":
      return "본문이 필요한 단계지만 현재 미리보기에는 본문이 포함되지 않았습니다.";
    default:
      return "";
  }
};

export const getPreviewContentRequirementLabel = ({
  contentIncluded,
  contentRequired,
  contentRequiredReason,
}: PreviewContentMetadata) => {
  if (!contentRequired) {
    return "";
  }

  if (contentIncluded === false) {
    return "본문이 필요한 단계지만 현재 미리보기에는 본문이 포함되지 않았습니다.";
  }

  switch (contentRequiredReason) {
    case "downstream":
      return "다음 단계에서 본문 필요";
    case "user_request":
      return "사용자 요청에 따라 본문 필요";
    case "runtime_config":
      return "실행 설정상 본문 필요";
    default:
      return "본문이 필요한 미리보기입니다.";
  }
};
