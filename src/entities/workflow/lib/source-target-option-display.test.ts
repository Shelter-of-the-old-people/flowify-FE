import { describe, expect, it } from "vitest";

import { type SourceTargetOptionItemResponse } from "../api";

import {
  getSourceTargetOptionDisplayLabel,
  getSourceTargetOptionGroupLabel,
  getSourceTargetOptionItemLabel,
  isGroupedSourceTargetOptionPicker,
} from "./source-target-option-display";

const createOption = (
  overrides: Partial<SourceTargetOptionItemResponse> = {},
): SourceTargetOptionItemResponse => ({
  description: null,
  id: "2",
  label: "일반",
  metadata: {},
  type: "category",
  ...overrides,
});

describe("source target option display", () => {
  it("uses display path as user-facing option label", () => {
    const option = createOption({
      metadata: { displayPath: "공지사항 > 일반" },
    });

    expect(getSourceTargetOptionDisplayLabel(option)).toBe("공지사항 > 일반");
  });

  it("uses board and category metadata for grouped picker labels", () => {
    const option = createOption({
      description: "공지사항",
      metadata: {
        boardName: "공지사항",
        categoryName: "일반",
      },
    });

    expect(getSourceTargetOptionGroupLabel(option)).toBe("공지사항");
    expect(getSourceTargetOptionItemLabel(option)).toBe("일반");
  });

  it("falls back to existing label and description when metadata is absent", () => {
    const option = createOption({ description: "SE Board" });

    expect(getSourceTargetOptionDisplayLabel(option)).toBe("일반");
    expect(getSourceTargetOptionGroupLabel(option)).toBe("SE Board");
    expect(getSourceTargetOptionItemLabel(option)).toBe("일반");
  });

  it("enables grouped picker only for web news category options", () => {
    expect(
      isGroupedSourceTargetOptionPicker("web_news", "category_picker"),
    ).toBe(true);
    expect(
      isGroupedSourceTargetOptionPicker("google_drive", "folder_picker"),
    ).toBe(false);
  });
});
