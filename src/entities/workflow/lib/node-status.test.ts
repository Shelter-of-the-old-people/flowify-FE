import { describe, expect, it } from "vitest";

import { getNodeStatusSummaryLabel } from "./node-status";

describe("node status summary", () => {
  it("maps required config fields to user-facing labels", () => {
    expect(
      getNodeStatusSummaryLabel({
        configured: false,
        executable: false,
        missingFields: ["config.prompt", "config.targetField"],
      }),
    ).toBe("필수 설정: 지시사항, 처리 대상");
  });

  it("falls back when backend status has no field details", () => {
    expect(
      getNodeStatusSummaryLabel({
        configured: false,
        executable: false,
        missingFields: null,
      }),
    ).toBe("설정 확인 필요");
  });

  it("separates execution condition from required config", () => {
    expect(
      getNodeStatusSummaryLabel({
        configured: true,
        executable: false,
        missingFields: ["oauth_token"],
      }),
    ).toBe("실행 조건: 인증 연결");
  });

  it("maps backend snake case fields to user-facing labels", () => {
    expect(
      getNodeStatusSummaryLabel({
        configured: false,
        executable: false,
        missingFields: ["config.key_column", "config.lookup_value"],
      }),
    ).toBe("필수 설정: 기준 열, 찾을 값");
  });

  it("does not render status text for executable nodes", () => {
    expect(
      getNodeStatusSummaryLabel({
        configured: true,
        executable: true,
        missingFields: null,
      }),
    ).toBeNull();
  });
});
