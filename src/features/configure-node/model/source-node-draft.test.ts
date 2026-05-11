import { describe, expect, it } from "vitest";

import { type FlowNodeData } from "@/entities/node";

import { buildSourceNodeConfigDraft } from "./source-node-draft";

const targetSchema = { type: "category_picker" };

const sourceConfig = (
  overrides: Record<string, unknown>,
): FlowNodeData["config"] =>
  ({
    isConfigured: true,
    service: "web_news",
    source_mode: "seboard_new_posts",
    target: "2",
    target_label: "공지사항",
    target_meta: { category: "notice" },
    ...overrides,
  }) as unknown as FlowNodeData["config"];

describe("buildSourceNodeConfigDraft", () => {
  it("preserves existing target summary when only keyword changes", () => {
    const result = buildSourceNodeConfigDraft({
      currentConfig: sourceConfig({ keyword: "장학" }),
      targetSchema,
      targetValue: {
        keyword: "수강신청",
        option: null,
        value: "2",
      },
    });

    expect(result.target).toBe("2");
    expect(result.target_label).toBe("공지사항");
    expect(result.target_meta).toEqual({ category: "notice" });
    expect(result.keyword).toBe("수강신청");
  });

  it("uses selected option summary when target is selected again", () => {
    const result = buildSourceNodeConfigDraft({
      currentConfig: sourceConfig({}),
      targetSchema,
      targetValue: {
        keyword: "",
        option: {
          description: null,
          id: "3",
          label: "학사 공지",
          metadata: { category: "academic" },
          type: "category",
        },
        value: "3",
      },
    });

    expect(result.target).toBe("3");
    expect(result.target_label).toBe("학사 공지");
    expect(result.target_meta).toEqual({ category: "academic" });
    expect(result.keyword).toBeUndefined();
  });

  it("uses display path as selected option summary when metadata provides it", () => {
    const result = buildSourceNodeConfigDraft({
      currentConfig: sourceConfig({}),
      targetSchema,
      targetValue: {
        keyword: "",
        option: {
          description: "공지사항",
          id: "3",
          label: "일반",
          metadata: {
            boardName: "공지사항",
            categoryName: "일반",
            displayPath: "공지사항 > 일반",
          },
          type: "category",
        },
        value: "3",
      },
    });

    expect(result.target).toBe("3");
    expect(result.target_label).toBe("공지사항 > 일반");
    expect(result.target_meta).toEqual({
      boardName: "공지사항",
      categoryName: "일반",
      displayPath: "공지사항 > 일반",
    });
  });

  it("does not preserve stale summary when target changes without option metadata", () => {
    const result = buildSourceNodeConfigDraft({
      currentConfig: sourceConfig({}),
      targetSchema,
      targetValue: {
        keyword: "",
        option: null,
        value: "4",
      },
    });

    expect(result.target).toBe("4");
    expect(result.target_label).toBe("4");
    expect(result.target_meta).toBeNull();
  });
});
