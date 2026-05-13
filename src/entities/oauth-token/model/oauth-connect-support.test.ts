import { describe, expect, it } from "vitest";

import {
  getOAuthConnectionUiState,
  getServiceConnectionKind,
} from "./oauth-connect-support";

describe("oauth connection support", () => {
  it("keeps oauth redirect services connectable", () => {
    expect(getServiceConnectionKind("gmail")).toBe("oauth_redirect");

    const state = getOAuthConnectionUiState({
      authRequired: true,
      connected: false,
      serviceKey: "gmail",
    });

    expect(state.actionLabel).toBe("연결 시작");
    expect(state.canStartConnect).toBe(true);
  });

  it("treats manual token services as account-page connections", () => {
    expect(getServiceConnectionKind("github")).toBe("manual_token");

    const state = getOAuthConnectionUiState({
      authRequired: true,
      connected: false,
      serviceKey: "github",
    });

    expect(state.label).toBe("토큰 입력 필요");
    expect(state.actionLabel).toBe("계정 페이지로 이동");
    expect(state.canStartConnect).toBe(true);
  });
});
