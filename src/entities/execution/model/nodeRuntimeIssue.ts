import { type NodeVisualIssue } from "@/entities/node";

import { type ExecutionDetail, type ExecutionErrorDetail } from "../api/types";

const DEFAULT_RUNTIME_ISSUE_MESSAGE = "이 단계 실행 중 문제가 발생했습니다.";

const includesAny = (value: string, keywords: string[]) =>
  keywords.some((keyword) => value.includes(keyword));

const getContextString = (
  context: Record<string, unknown> | null | undefined,
  keys: readonly string[],
) => {
  if (!context) {
    return "";
  }

  for (const key of keys) {
    const value = context[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim().toLowerCase();
    }
  }

  return "";
};

const getDocumentContentStatusMessage = (status: string) => {
  switch (status) {
    case "empty":
      return "읽을 수 있는 텍스트를 찾지 못했습니다.";
    case "unsupported":
      return "현재 이 파일의 본문 추출을 지원하지 않습니다.";
    case "too_large":
      return "파일이 현재 처리 가능한 크기나 페이지 수를 초과했습니다.";
    case "failed":
      return "본문을 추출하는 중 문제가 발생했습니다.";
    case "not_requested":
      return "본문이 필요한 작업이지만 본문 추출이 수행되지 않았습니다.";
    default:
      return "";
  }
};

export const getExecutionErrorDisplayMessage = (
  error: ExecutionErrorDetail | null | undefined,
) => {
  const contentStatus = getContextString(error?.context, [
    "content_status",
    "contentStatus",
  ]);
  const contentStatusMessage = getDocumentContentStatusMessage(contentStatus);
  if (contentStatusMessage) {
    return contentStatusMessage;
  }

  const code = error?.code?.toLowerCase() ?? "";
  const message = error?.message?.toLowerCase() ?? "";
  const text = `${code} ${message}`;

  if (
    includesAny(text, [
      "document_content_empty",
      "content_empty",
      "content status empty",
      "읽을 수 있는 본문",
      "본문 없음",
    ])
  ) {
    return "읽을 수 있는 텍스트를 찾지 못했습니다.";
  }

  if (
    includesAny(text, [
      "document_content_unsupported",
      "unsupported_file_type",
      "unsupported content",
      "unsupported document",
      "지원하지 않는 파일",
      "지원하지 않는 형식",
    ])
  ) {
    return "현재 이 파일의 본문 추출을 지원하지 않습니다.";
  }

  if (
    includesAny(text, [
      "document_content_too_large",
      "file_too_large",
      "content_too_large",
      "max_download_bytes",
      "max_extracted_chars",
      "max_ocr_pages",
      "max_image_pixels",
      "page limit",
      "pixel limit",
      "크기 제한",
      "용량 제한",
      "페이지 수",
    ])
  ) {
    return "파일이 현재 처리 가능한 크기나 페이지 수를 초과했습니다.";
  }

  if (
    includesAny(text, [
      "document_content_required_but_unavailable",
      "content_required_but_unavailable",
      "requires_content",
      "required by downstream",
      "본문이 필요한",
      "본문 필요",
    ])
  ) {
    return "다음 단계에서 파일 본문이 필요하지만 현재 본문을 사용할 수 없습니다.";
  }

  if (
    includesAny(text, [
      "document_content_extraction_failed",
      "document_content_failed",
      "content_extraction_failed",
      "extract document content",
      "본문 추출",
      "본문 읽기 실패",
    ])
  ) {
    return "본문을 추출하는 중 문제가 발생했습니다.";
  }

  if (
    includesAny(text, [
      "document_content_not_requested",
      "content_not_requested",
      "not requested",
      "본문 미포함",
    ])
  ) {
    return "본문이 필요한 작업이지만 본문 추출이 수행되지 않았습니다.";
  }

  if (
    includesAny(text, [
      "oauth",
      "token",
      "unauthorized",
      "forbidden",
      "permission",
      "scope",
      "인증",
      "권한",
    ])
  ) {
    return "서비스 연결을 다시 확인해 주세요.";
  }

  if (
    includesAny(text, ["key_column", "key column", "column", "headers", "열"])
  ) {
    return "선택한 열을 찾지 못했습니다.";
  }

  if (
    includesAny(text, [
      "not found",
      "resource was not found",
      "찾을 수 없습니다",
      "찾지 못했습니다",
    ])
  ) {
    return "선택한 대상을 찾지 못했습니다.";
  }

  if (
    includesAny(text, [
      "empty",
      "no input",
      "input data",
      "입력 데이터",
      "들어온 데이터",
    ])
  ) {
    return "이 단계에 들어온 데이터가 없습니다.";
  }

  if (includesAny(text, ["rate", "limit", "quota", "한도"])) {
    return "외부 서비스 요청이 많아 잠시 후 다시 시도해 주세요.";
  }

  if (
    includesAny(text, [
      "api",
      "external",
      "service",
      "webhook",
      "요청",
      "호출",
      "전송",
    ])
  ) {
    return "외부 서비스 요청에 실패했습니다.";
  }

  return DEFAULT_RUNTIME_ISSUE_MESSAGE;
};

export const getUserFriendlyExecutionErrorMessage =
  getExecutionErrorDisplayMessage;

export const toNodeRuntimeIssueMap = (
  execution: ExecutionDetail | null | undefined,
): Record<string, NodeVisualIssue> => {
  if (!execution) {
    return {};
  }

  return Object.fromEntries(
    execution.nodeLogs
      .filter((log) => log.status === "failed")
      .map((log) => [
        log.nodeId,
        {
          tone: "error",
          message: getUserFriendlyExecutionErrorMessage(log.error),
        },
      ]),
  );
};
