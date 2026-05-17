import { describe, expect, it } from "vitest";

import {
  getExecutionErrorDisplayMessage,
  toNodeRuntimeIssueMap,
} from "./nodeRuntimeIssue";

describe("node runtime issue", () => {
  it("maps only failed execution logs to node issues", () => {
    expect(
      toNodeRuntimeIssueMap({
        completedNodeCount: 1,
        durationMs: null,
        errorMessage: null,
        finishedAt: null,
        id: "execution-1",
        nodeCount: 2,
        nodeLogs: [
          {
            error: null,
            finishedAt: null,
            inputData: null,
            nodeId: "source-1",
            outputData: null,
            startedAt: null,
            status: "success",
          },
          {
            error: {
              code: "NODE_EXECUTION_FAILED",
              message: "Google Sheets key_column 'email' is not present.",
              stackTrace: null,
            },
            finishedAt: null,
            inputData: null,
            nodeId: "sheet-1",
            outputData: null,
            startedAt: null,
            status: "failed",
          },
        ],
        startedAt: null,
        state: "failed",
        workflowId: "workflow-1",
      }),
    ).toEqual({
      "sheet-1": {
        tone: "error",
        message: "선택한 열을 찾지 못했습니다.",
      },
    });
  });

  it("uses a service connection message for auth errors", () => {
    expect(
      toNodeRuntimeIssueMap({
        completedNodeCount: 0,
        durationMs: null,
        errorMessage: null,
        finishedAt: null,
        id: "execution-1",
        nodeCount: 1,
        nodeLogs: [
          {
            error: {
              code: "OAUTH_TOKEN_EXPIRED",
              message: "OAuth token is invalid.",
              stackTrace: null,
            },
            finishedAt: null,
            inputData: null,
            nodeId: "drive-1",
            outputData: null,
            startedAt: null,
            status: "failed",
          },
        ],
        startedAt: null,
        state: "failed",
        workflowId: "workflow-1",
      }),
    ).toEqual({
      "drive-1": {
        tone: "error",
        message: "서비스 연결을 다시 확인해 주세요.",
      },
    });
  });

  it("maps document content runtime errors to actionable messages", () => {
    expect(
      getExecutionErrorDisplayMessage({
        code: "DOCUMENT_CONTENT_REQUIRED_BUT_UNAVAILABLE",
        message: "content_required_but_unavailable",
        stackTrace: null,
      }),
    ).toBe(
      "다음 단계에서 파일 본문이 필요하지만 현재 본문을 사용할 수 없습니다.",
    );

    expect(
      getExecutionErrorDisplayMessage({
        code: "DOCUMENT_CONTENT_TOO_LARGE",
        message: "max_download_bytes exceeded",
        stackTrace: null,
      }),
    ).toBe("파일이 현재 처리 가능한 크기나 페이지 수를 초과했습니다.");

    expect(
      getExecutionErrorDisplayMessage({
        code: "DOCUMENT_CONTENT_NOT_REQUESTED",
        message: "metadata only preview",
        stackTrace: null,
      }),
    ).toBe("본문이 필요한 작업이지만 본문 추출이 수행되지 않았습니다.");
  });

  it("prefers document content status in error context", () => {
    expect(
      getExecutionErrorDisplayMessage({
        code: "DOCUMENT_CONTENT_EXTRACTION_FAILED",
        message: "provider returned a custom error",
        stackTrace: null,
        context: {
          content_status: "unsupported",
          content_error: "provider disabled",
        },
      }),
    ).toBe("현재 이 파일의 본문 추출을 지원하지 않습니다.");
  });
});
