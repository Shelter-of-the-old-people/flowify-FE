import { describe, expect, it } from "vitest";

import { type FlowNodeData } from "@/entities/node";

import {
  buildSourceNodeConfigDraft,
  buildSourceTargetConfigDraft,
  isSourceNodeSetupComplete,
} from "./source-node-draft";

const webNewsTargetSchema = { type: "category_picker" };

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
      currentConfig: sourceConfig({ keyword: "수학" }),
      targetSchema: webNewsTargetSchema,
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
      targetSchema: webNewsTargetSchema,
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
      targetSchema: webNewsTargetSchema,
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
      targetSchema: webNewsTargetSchema,
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

  it("derives spreadsheet metadata from a Google Sheets picker selection", () => {
    const nextConfig = buildSourceTargetConfigDraft({
      currentConfig: {
        isConfigured: false,
        service: "google_sheets",
        source_mode: "sheet_all",
        target: null,
      } as never,
      targetValue: {
        keyword: "",
        value: "spreadsheet-1::sheet::Sheet1",
        option: {
          id: "spreadsheet-1::sheet::Sheet1",
          label: "Budget 2026 / Sheet1",
          description: "Google Sheets tab",
          type: "sheet",
          metadata: {
            spreadsheetId: "spreadsheet-1",
            spreadsheetTitle: "Budget 2026",
            sheetName: "Sheet1",
            sheetId: 101,
          },
        },
      },
    });

    expect(nextConfig).toMatchObject({
      target: "spreadsheet-1",
      target_label: "Budget 2026 / Sheet1",
      spreadsheet_id: "spreadsheet-1",
      sheet_name: "Sheet1",
      sheet_id: 101,
      header_row: 1,
      data_start_row: 2,
      initial_sync_mode: "skip_existing",
    });
  });

  it("treats row_updated sheets as incomplete without a key column", () => {
    const nextConfig = buildSourceNodeConfigDraft({
      currentConfig: {
        isConfigured: false,
        service: "google_sheets",
        source_mode: "row_updated",
      } as never,
      targetSchema: { type: "sheet_picker", required: true },
      targetValue: {
        keyword: "",
        value: "spreadsheet-1::sheet::Sheet1",
        option: {
          id: "spreadsheet-1::sheet::Sheet1",
          label: "Budget 2026 / Sheet1",
          description: "Google Sheets tab",
          type: "sheet",
          metadata: {
            spreadsheetId: "spreadsheet-1",
            sheetName: "Sheet1",
          },
        },
      },
    });

    expect(
      isSourceNodeSetupComplete(nextConfig, { type: "sheet_picker" }),
    ).toBe(false);
    expect(nextConfig.isConfigured).toBe(false);
  });

  it("marks row_updated sheets configured when the key column is provided", () => {
    const nextConfig = buildSourceNodeConfigDraft({
      currentConfig: {
        isConfigured: false,
        service: "google_sheets",
        source_mode: "row_updated",
        key_column: "id",
      } as never,
      targetSchema: { type: "sheet_picker", required: true },
      targetValue: {
        keyword: "",
        value: "spreadsheet-1::sheet::Sheet1",
        option: {
          id: "spreadsheet-1::sheet::Sheet1",
          label: "Budget 2026 / Sheet1",
          description: "Google Sheets tab",
          type: "sheet",
          metadata: {
            spreadsheetId: "spreadsheet-1",
            sheetName: "Sheet1",
          },
        },
      },
    });

    expect(nextConfig.isConfigured).toBe(true);
  });
});
