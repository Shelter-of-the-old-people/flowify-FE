import { renderToStaticMarkup } from "react-dom/server";

import { ChakraProvider } from "@chakra-ui/react";
import { describe, expect, it } from "vitest";

import { system } from "@/shared";

import { DataPreviewBlock } from "./DataPreviewBlock";

const renderDataPreviewBlock = (
  props: React.ComponentProps<typeof DataPreviewBlock>,
) =>
  renderToStaticMarkup(
    <ChakraProvider value={system}>
      <DataPreviewBlock {...props} />
    </ChakraProvider>,
  );

describe("DataPreviewBlock", () => {
  it("shows document content status and extracted content for files", () => {
    const html = renderDataPreviewBlock({
      data: {
        type: "FILE_LIST",
        files: [
          {
            filename: "report.pdf",
            content_status: "available",
            content: "요약 가능한 본문입니다.",
            content_metadata: {
              char_count: 120,
            },
          },
          {
            filename: "large.pdf",
            content_status: "too_large",
            content_error: "limit exceeded",
          },
        ],
      },
      previewMetadata: {
        contentPolicy: "content_included",
        contentRequired: true,
        contentRequiredReason: "downstream",
      },
    });

    expect(html).toContain("본문 포함 미리보기");
    expect(html).toContain("다음 단계에서 본문 필요");
    expect(html).toContain("본문 추출 성공 1개");
    expect(html).toContain("처리 제한 초과 1개");
    expect(html).toContain("본문 미리보기: 요약 가능한 본문입니다.");
    expect(html).toContain(
      "파일이 현재 처리 가능한 크기나 페이지 수를 초과했습니다.",
    );
    expect(html).not.toContain("limit exceeded");
  });

  it("shows Gmail inline image and mixed image extraction results safely", () => {
    const html = renderDataPreviewBlock({
      data: {
        type: "SINGLE_EMAIL",
        email: {
          subject: "첨부 메일",
          attachments: [
            {
              filename: "signature.png",
              mimeType: "image/png",
              messageId: "msg-1",
              attachment_id: "att-1",
              inline: true,
              content_status: "unsupported",
            },
            {
              filename: "receipt.png",
              mime_type: "image/png",
              content_status: "available",
              content: "OCR 결과와 이미지 설명이 함께 들어간 텍스트입니다.",
              content_metadata: {
                content_kind: "mixed",
              },
            },
          ],
        },
      },
    });

    expect(html).toContain("inline image는 본문 추출 대상이 아닙니다.");
    expect(html).toContain(
      "첨부 본문 미리보기: OCR 결과와 이미지 설명이 함께 들어간 텍스트입니다.",
    );
  });
});
