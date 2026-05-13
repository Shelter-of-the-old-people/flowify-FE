import { describe, expect, it } from "vitest";

import { getSpreadsheetPreviewSummary } from "./spreadsheet-preview";

describe("getSpreadsheetPreviewSummary", () => {
  it("uses total_rows metadata when preview payload is truncated", () => {
    expect(
      getSpreadsheetPreviewSummary({
        data: {
          metadata: {
            total_rows: 27,
            truncated: true,
          },
          truncated: true,
        },
        displayedRowCount: 5,
        rowCount: 5,
      }),
    ).toEqual({
      omittedCount: 22,
      totalRows: 27,
    });
  });

  it("falls back to current row count when metadata is missing", () => {
    expect(
      getSpreadsheetPreviewSummary({
        data: {},
        displayedRowCount: 3,
        rowCount: 8,
      }),
    ).toEqual({
      omittedCount: 5,
      totalRows: 8,
    });
  });
});
