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
        source_service: "gmail",
        message_id: "msg-1",
        attachment_id: "att-1",
        mime_type: "application/pdf",
        inline: "false",
        page_count: "3",
        ocr_page_count: 2,
        image_width: 1200,
        image_height: "800",
        truncated: true,
        char_count: "1200",
        original_char_count: 2400,
        stored_content_truncated: true,
        stored_char_count: 1000,
        limits: {
          max_download_bytes: 100,
          max_extracted_chars: "2000",
          max_llm_input_chars: 3000,
          max_ocr_pages: "10",
          max_image_pixels: 12000000,
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
      sourceService: "gmail",
      messageId: "msg-1",
      attachmentId: "att-1",
      mimeType: "application/pdf",
      inline: false,
      pageCount: 3,
      ocrPageCount: 2,
      imageWidth: 1200,
      imageHeight: 800,
      limits: {
        maxDownloadBytes: 100,
        maxExtractedChars: 2000,
        maxLlmInputChars: 3000,
        maxOcrPages: 10,
        maxImagePixels: 12000000,
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
          maxOcrPages: 8,
          maxImagePixels: 1000000,
        },
      },
    };

    expect(getDocumentContentStatus(data)).toBe("too_large");
    expect(getDocumentContentMetadata(data).limits.maxDownloadBytes).toBe(2048);
    expect(getDocumentContentMetadata(data).limits.maxOcrPages).toBe(8);
  });

  it("reads Gmail attachment aliases from top-level payload", () => {
    const metadata = getDocumentContentMetadata({
      messageId: "camel-message",
      attachment_id: "snake-attachment",
      mimeType: "image/png",
      source: "gmail",
      inline: true,
      content_metadata: {
        content_kind: "mixed",
      },
    });

    expect(metadata.sourceService).toBe("gmail");
    expect(metadata.messageId).toBe("camel-message");
    expect(metadata.attachmentId).toBe("snake-attachment");
    expect(metadata.mimeType).toBe("image/png");
    expect(metadata.inline).toBe(true);
    expect(metadata.contentKind).toBe("mixed");
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
          imageHeight: null,
          imageWidth: null,
          inline: false,
          limits: {
            maxDownloadBytes: null,
            maxExtractedChars: null,
            maxLlmInputChars: null,
            maxImagePixels: null,
            maxOcrPages: null,
          },
          messageId: null,
          attachmentId: null,
          mimeType: null,
          ocrPageCount: null,
          originalCharCount: null,
          pageCount: null,
          sourceService: null,
          storedCharCount: null,
          storedContentTruncated: true,
          truncated: false,
        },
        status: "available",
      }),
    ).toBe("실행 로그에는 일부 본문만 저장되었습니다.");
  });

  it("uses status-based document content descriptions", () => {
    const baseMetadata = getDocumentContentMetadata({});

    expect(
      getDocumentContentStatusDescription({
        error: "raw backend text",
        metadata: baseMetadata,
        status: "not_requested",
      }),
    ).toBe("본문은 아직 불러오지 않았습니다.");
    expect(
      getDocumentContentStatusDescription({
        error: "different raw backend text",
        metadata: baseMetadata,
        status: "too_large",
      }),
    ).toBe("파일이 현재 처리 가능한 크기나 페이지 수를 초과했습니다.");
    expect(
      getDocumentContentStatusDescription({
        error: "",
        metadata: getDocumentContentMetadata({ inline: true }),
        status: "unsupported",
      }),
    ).toBe("inline image는 본문 추출 대상이 아닙니다.");
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
