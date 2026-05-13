import { describe, expect, it } from "vitest";

import { getNodeSummaryLines } from "./nodeSummary";
import { type FlowNodeData } from "./types";

describe("node summary", () => {
  it("does not invent missing labels for unfilled web source nodes", () => {
    const data = {
      config: {
        isConfigured: false,
        outputFields: [],
        pagination: false,
        selector: null,
        targetUrl: null,
      },
      inputTypes: [],
      label: "웹 수집",
      outputTypes: ["api-response"],
      type: "web-scraping",
    } as FlowNodeData;

    expect(getNodeSummaryLines(data)).toEqual([]);
  });

  it("summarizes configured llm nodes without exposing long prompts", () => {
    const data = {
      config: {
        isConfigured: true,
        model: null,
        outputFormat: "text",
        prompt: "입력된 내용을 요약해줘.",
        temperature: 0.7,
      },
      inputTypes: ["text"],
      label: "AI",
      outputTypes: ["text"],
      type: "llm",
    } as FlowNodeData;

    expect(getNodeSummaryLines(data)).toEqual([
      "지시사항 설정됨",
      "출력: text",
    ]);
  });

  it("summarizes loop target and iteration limit", () => {
    const data = {
      config: {
        isConfigured: true,
        maxIterations: 100,
        targetField: "items",
        timeout: 300,
      },
      inputTypes: ["file-list"],
      label: "하나씩 처리",
      outputTypes: ["single-file"],
      type: "loop",
    } as FlowNodeData;

    expect(getNodeSummaryLines(data)).toEqual([
      "처리 대상: items",
      "최대 100회",
    ]);
  });
});
