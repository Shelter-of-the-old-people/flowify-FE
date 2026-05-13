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
    expect(html).toContain("본문 읽기 완료 1개");
    expect(html).toContain("파일 크기 제한 초과 1개");
    expect(html).toContain("본문: 요약 가능한 본문입니다.");
    expect(html).toContain("limit exceeded");
  });
});
