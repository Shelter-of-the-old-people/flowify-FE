import { describe, expect, it } from "vitest";

import {
  getGoogleSheetsActionDescription,
  getGoogleSheetsInitialSyncPresentation,
  getGoogleSheetsSourceModeDescription,
  getGoogleSheetsWriteModePresentation,
} from "./google-sheets-presentation";

describe("google sheets presentation helpers", () => {
  it("returns a friendly write-mode description", () => {
    expect(getGoogleSheetsWriteModePresentation("append_rows")).toMatchObject({
      label: "행 추가",
      description: "기존 내용 아래에 새 행을 계속 추가합니다.",
    });
  });

  it("returns a friendly initial-sync description", () => {
    expect(
      getGoogleSheetsInitialSyncPresentation("emit_existing"),
    ).toMatchObject({
      label: "기존 행도 처리",
      description:
        "첫 실행에서 현재 있는 행도 한 번 처리하고, 다음부터는 변경분만 읽습니다.",
    });
  });

  it("describes row_updated source mode in user language", () => {
    expect(getGoogleSheetsSourceModeDescription("row_updated")).toBe(
      "기준 컬럼으로 같은 행을 찾고, 내용이 바뀐 행만 감지해서 전달합니다.",
    );
  });

  it("describes lookup action in user language", () => {
    expect(getGoogleSheetsActionDescription("lookup_row_by_key")).toBe(
      "기준 컬럼 값이 같은 한 행을 찾아 참조 데이터처럼 사용합니다.",
    );
  });
});
