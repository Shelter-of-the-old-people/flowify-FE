import { describe, expect, it } from "vitest";

import {
  getDocumentContentMetadata,
  getDocumentContentStatus,
  getDocumentContentStatusDescription,
  getDocumentContentText,
  getPreviewContentMetadata,
  getPreviewContentPolicyLabel,
  getPreviewContentRequirementLabel,
  isDocumentContentUnavailableForSummary,
} from "./document-content";

describe("document content helpers", () => {
  it("reads snake_case content contract fields", () => {
    const data = {
      content: "본문",
      content_status: "available",
      content_metadata: {
        extraction_method: "pdf_text",
        content_kind: "plain_text",
        truncated: true,
        char_count: "1200",
        original_char_count: 2400,
        stored_content_truncated: true,
        stored_char_count: 1000,
        limits: {
          max_download_bytes: 100,
          max_extracted_chars: "2000",
          max_llm_input_chars: 3000,
        },
      },
    };

    expect(getDocumentContentText(data)).toBe("본문");
    expect(getDocumentContentStatus(data)).toBe("available");
    expect(getDocumentContentMetadata(data)).toEqual({
      extractionMethod: "pdf_text",
      contentKind: "plain_text",
      truncated: true,
      charCount: 1200,
      originalCharCount: 2400,
      storedContentTruncated: true,
      storedCharCount: 1000,
      limits: {
        maxDownloadBytes: 100,
        maxExtractedChars: 2000,
        maxLlmInputChars: 3000,
      },
    });
  });

  it("reads camelCase content contract fields", () => {
    const data = {
      contentStatus: "too_large",
      contentMetadata: {
        extractionMethod: "plain_text",
        contentKind: "plain_text",
        originalCharCount: 5000,
        storedContentTruncated: false,
        storedCharCount: null,
        limits: {
          maxDownloadBytes: 2048,
          maxExtractedChars: 4000,
          maxLlmInputChars: 3000,
        },
      },
    };

    expect(getDocumentContentStatus(data)).toBe("too_large");
    expect(getDocumentContentMetadata(data).limits.maxDownloadBytes).toBe(2048);
  });

  it("falls back to legacy extracted text", () => {
    expect(getDocumentContentText({ extracted_text: "legacy" })).toBe("legacy");
    expect(getDocumentContentText({ extractedText: "legacy camel" })).toBe(
      "legacy camel",
    );
  });

  it("describes unavailable content states", () => {
    expect(isDocumentContentUnavailableForSummary("empty")).toBe(true);
    expect(isDocumentContentUnavailableForSummary("available")).toBe(false);
    expect(
      getDocumentContentStatusDescription({
        error: "",
        metadata: {
          charCount: null,
          contentKind: null,
          extractionMethod: null,
          limits: {
            maxDownloadBytes: null,
            maxExtractedChars: null,
            maxLlmInputChars: null,
          },
          originalCharCount: null,
          storedCharCount: null,
          storedContentTruncated: true,
          truncated: false,
        },
        status: "available",
      }),
    ).toBe("실행 로그에는 일부 본문만 저장되었습니다.");
  });

  it("reads preview content policy metadata", () => {
    expect(
      getPreviewContentMetadata({
        contentPolicy: "content_required_but_unavailable",
        contentStatusScope: "node",
        previewScope: "source_metadata",
        contentIncluded: false,
        contentRequired: true,
        contentRequiredReason: "downstream",
      }),
    ).toEqual({
      contentIncluded: false,
      contentPolicy: "content_required_but_unavailable",
      contentRequired: true,
      contentRequiredReason: "downstream",
      contentStatusScope: "node",
      previewScope: "source_metadata",
    });
    expect(
      getPreviewContentPolicyLabel("content_required_but_unavailable"),
    ).toContain("본문이 필요한 단계");
    expect(
      getPreviewContentRequirementLabel({
        contentIncluded: false,
        contentPolicy: "content_status_only",
        contentRequired: true,
        contentRequiredReason: "downstream",
        contentStatusScope: "item",
        previewScope: "source_metadata",
      }),
    ).toContain("현재 미리보기에는 본문이 포함되지 않았습니다");
  });
});
