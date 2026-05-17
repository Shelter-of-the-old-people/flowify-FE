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
  sourceService: string | null;
  messageId: string | null;
  attachmentId: string | null;
  mimeType: string | null;
  inline: boolean;
  pageCount: number | null;
  ocrPageCount: number | null;
  imageWidth: number | null;
  imageHeight: number | null;
  limits: {
    maxDownloadBytes: number | null;
    maxExtractedChars: number | null;
    maxLlmInputChars: number | null;
    maxOcrPages: number | null;
    maxImagePixels: number | null;
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

const getBoolean = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue === "true") {
      return true;
    }
    if (normalizedValue === "false") {
      return false;
    }
  }

  return null;
};

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
  const source = isRecord(value) ? value : {};
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
    sourceService:
      getFirstString(metadata, ["source_service", "sourceService"]) ||
      getFirstString(source, ["source_service", "sourceService", "source"]) ||
      null,
    messageId:
      getFirstString(metadata, ["message_id", "messageId"]) ||
      getFirstString(source, ["message_id", "messageId"]) ||
      null,
    attachmentId:
      getFirstString(metadata, ["attachment_id", "attachmentId"]) ||
      getFirstString(source, ["attachment_id", "attachmentId"]) ||
      null,
    mimeType:
      getFirstString(metadata, ["mime_type", "mimeType"]) ||
      getFirstString(source, ["mime_type", "mimeType"]) ||
      null,
    inline:
      getFirstBoolean(metadata, ["inline"]) ||
      getFirstBoolean(source, ["inline"]),
    pageCount: getFirstNumber(metadata, ["page_count", "pageCount"]),
    ocrPageCount: getFirstNumber(metadata, ["ocr_page_count", "ocrPageCount"]),
    imageWidth: getFirstNumber(metadata, ["image_width", "imageWidth"]),
    imageHeight: getFirstNumber(metadata, ["image_height", "imageHeight"]),
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
      maxOcrPages: getFirstNumber(limits, ["max_ocr_pages", "maxOcrPages"]),
      maxImagePixels: getFirstNumber(limits, [
        "max_image_pixels",
        "maxImagePixels",
      ]),
    },
  };
};

export const getDocumentContentStatusLabel = (
  status: DocumentContentStatus | null,
) => {
  switch (status) {
    case "available":
      return "본문 추출 성공";
    case "empty":
      return "텍스트 없음";
    case "unsupported":
      return "본문 추출 미지원";
    case "too_large":
      return "처리 제한 초과";
    case "failed":
      return "본문 추출 실패";
    case "not_requested":
      return "본문 미요청";
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
  switch (status) {
    case "available":
      if (metadata.storedContentTruncated) {
        return "실행 로그에는 일부 본문만 저장되었습니다.";
      }

      if (metadata.truncated) {
        return "본문 일부만 표시됩니다.";
      }

      return "";
    case "not_requested":
      return "본문은 아직 불러오지 않았습니다.";
    case "unsupported":
      return metadata.inline
        ? "inline image는 본문 추출 대상이 아닙니다."
        : "현재 이 파일의 본문 추출을 지원하지 않습니다.";
    case "too_large":
      return "파일이 현재 처리 가능한 크기나 페이지 수를 초과했습니다.";
    case "empty":
      return "읽을 수 있는 텍스트를 찾지 못했습니다.";
    case "failed":
      return "본문을 추출하는 중 문제가 발생했습니다.";
    default:
      return error ?? "";
  }
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
