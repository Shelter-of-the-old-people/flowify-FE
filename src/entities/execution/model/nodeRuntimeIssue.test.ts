import { describe, expect, it } from "vitest";

import { toNodeRuntimeIssueMap } from "./nodeRuntimeIssue";

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
});
