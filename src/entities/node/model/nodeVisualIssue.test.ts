import { describe, expect, it } from "vitest";

import { resolveNodeVisualIssue } from "./nodeVisualIssue";

describe("node visual issue", () => {
  it("prefers runtime errors over configuration warnings", () => {
    expect(
      resolveNodeVisualIssue({
        runtimeIssue: {
          tone: "error",
          message: "이 단계 실행 중 문제가 발생했습니다.",
        },
        nodeStatus: {
          configured: false,
          executable: false,
          missingFields: ["config.prompt"],
        },
      }),
    ).toEqual({
      tone: "error",
      message: "이 단계 실행 중 문제가 발생했습니다.",
    });
  });

  it("returns a warning when required configuration is missing", () => {
    expect(
      resolveNodeVisualIssue({
        nodeStatus: {
          configured: false,
          executable: false,
          missingFields: ["config.prompt"],
        },
      }),
    ).toEqual({
      tone: "warning",
      message: "필수 설정: 지시사항",
    });
  });

  it("does not return an issue for executable nodes", () => {
    expect(
      resolveNodeVisualIssue({
        nodeStatus: {
          configured: true,
          executable: true,
          missingFields: null,
        },
      }),
    ).toBeNull();
  });
});
