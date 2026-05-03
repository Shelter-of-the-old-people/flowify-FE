import { renderToStaticMarkup } from "react-dom/server";

import { ChakraProvider } from "@chakra-ui/react";
import { describe, expect, it, vi } from "vitest";

import { system } from "@/shared";

import { FollowUpStep } from "./WizardStepContent";

const renderFollowUpStep = (props: React.ComponentProps<typeof FollowUpStep>) =>
  renderToStaticMarkup(
    <ChakraProvider value={system}>
      <FollowUpStep {...props} />
    </ChakraProvider>,
  );

const getCompleteButtonTag = (html: string) => {
  const match = html.match(/<button[^>]*>완료<\/button>/);
  return match?.[0] ?? "";
};

describe("FollowUpStep", () => {
  it("blocks completion when dynamic options are unresolved", () => {
    const html = renderFollowUpStep({
      followUp: {
        question: "필드를 선택하세요",
        options: [],
        options_source: "fields_from_service",
        multi_select: true,
      },
      branchConfig: null,
      onBack: vi.fn(),
      onComplete: vi.fn(),
    });

    expect(html).toContain(
      "이전 노드의 서비스 또는 필드 정보가 부족해 옵션을 불러오지 못했습니다.",
    );
    expect(getCompleteButtonTag(html)).toContain("disabled");
  });

  it("allows completion when an empty static follow-up has no options source", () => {
    const html = renderFollowUpStep({
      followUp: {
        question: "추가 설정",
        options: [],
        options_source: null,
        multi_select: false,
      },
      branchConfig: null,
      onBack: vi.fn(),
      onComplete: vi.fn(),
    });

    expect(html).toContain("현재 단계에서 보여줄 추가 옵션이 없습니다.");
    expect(getCompleteButtonTag(html)).not.toContain("disabled");
  });
});
