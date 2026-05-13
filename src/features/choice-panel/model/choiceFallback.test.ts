import { describe, expect, it } from "vitest";

import { resolveActionChoiceResponse } from "./choiceFallback";
import { MAPPING_RULES } from "./mappingRules";

describe("resolveActionChoiceResponse", () => {
  it("falls back to action choices when the server responds with processing-method choices", () => {
    const result = resolveActionChoiceResponse({
      allowFallback: true,
      currentDataTypeKey: "SPREADSHEET_DATA",
      mappingRules: MAPPING_RULES,
      serverChoice: {
        question: "데이터를 어떻게 처리할까요?",
        options: [
          {
            id: "one_by_one",
            label: "한 행씩 처리",
          },
          {
            id: "all_at_once",
            label: "전체 사용",
          },
        ],
        requiresProcessingMethod: true,
      },
    });

    expect(result.source).toBe("fallback");
    expect(result.choice?.requiresProcessingMethod).toBe(false);
    expect(
      result.choice?.options.some(
        (option) => option.id === "filter_fields_table",
      ),
    ).toBe(true);
    expect(
      result.choice?.options.some((option) => option.id === "all_at_once"),
    ).toBe(false);
  });

  it("still falls back when the server choice is invalid even without a server error", () => {
    const result = resolveActionChoiceResponse({
      allowFallback: false,
      currentDataTypeKey: "SPREADSHEET_DATA",
      mappingRules: MAPPING_RULES,
      serverChoice: {
        question: "데이터를 어떻게 처리할까요?",
        options: [
          {
            id: "one_by_one",
            label: "한 행씩 처리",
          },
          {
            id: "all_at_once",
            label: "전체 사용",
          },
        ],
        requiresProcessingMethod: true,
      },
    });

    expect(result.source).toBe("fallback");
    expect(result.choice?.requiresProcessingMethod).toBe(false);
    expect(result.choice?.options.length).toBeGreaterThan(0);
  });
});
