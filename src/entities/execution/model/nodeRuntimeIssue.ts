import { type NodeVisualIssue } from "@/entities/node";

import { type ExecutionDetail, type ExecutionErrorDetail } from "../api/types";

const DEFAULT_RUNTIME_ISSUE_MESSAGE = "이 단계 실행 중 문제가 발생했습니다.";

const includesAny = (value: string, keywords: string[]) =>
  keywords.some((keyword) => value.includes(keyword));

export const getUserFriendlyExecutionErrorMessage = (
  error: ExecutionErrorDetail | null | undefined,
) => {
  const code = error?.code?.toLowerCase() ?? "";
  const message = error?.message?.toLowerCase() ?? "";
  const text = `${code} ${message}`;

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
