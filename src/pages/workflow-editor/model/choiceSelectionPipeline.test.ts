import { describe, expect, it } from "vitest";

import { type NodeSelectionResult } from "@/entities/workflow";
import {
  MAPPING_RULES,
  type ResolvedChoiceOption,
  buildFallbackChoiceResponse,
} from "@/features/choice-panel";

import { deriveProcessingMethodSelectionIntent } from "./choiceSelectionPipeline";

const getProcessingMethodOption = (
  dataTypeKey: "FILE_LIST" | "SPREADSHEET_DATA",
  optionId: string,
) => {
  const response = buildFallbackChoiceResponse(
    MAPPING_RULES,
    dataTypeKey,
    "initial",
  );
  const option = response.options.find((current) => current.id === optionId);

  if (!option) {
    throw new Error(`Missing processing method option: ${optionId}`);
  }

  return option;
};

const createSelectionResult = (
  option: ResolvedChoiceOption,
): NodeSelectionResult => ({
  branchConfig: option.branchConfig ?? null,
  nodeType: option.node_type ?? null,
  outputDataType: option.output_data_type ?? null,
});

describe("choice selection pipeline", () => {
  it("marks passthrough processing methods complete immediately", () => {
    const option = getProcessingMethodOption("SPREADSHEET_DATA", "all_at_once");

    const result = deriveProcessingMethodSelectionIntent({
      currentDataTypeKey: "SPREADSHEET_DATA",
      mappingRules: MAPPING_RULES,
      option,
      selectionResult: createSelectionResult(option),
    });

    expect(result.nextChoiceNodeType).toBe("PASSTHROUGH");
    expect(result.nextNodeType).toBe("data-process");
    expect(result.nextStep).toBe("complete");
    expect(result.isConfigured).toBe(true);
    expect(result.hasFollowUp).toBe(false);
  });

  it("keeps non-passthrough processing methods in the existing action flow", () => {
    const option = getProcessingMethodOption("SPREADSHEET_DATA", "one_by_one");

    const result = deriveProcessingMethodSelectionIntent({
      currentDataTypeKey: "SPREADSHEET_DATA",
      mappingRules: MAPPING_RULES,
      option,
      selectionResult: createSelectionResult(option),
    });

    expect(result.nextChoiceNodeType).toBe("LOOP");
    expect(result.nextStep).toBe("action");
    expect(result.isConfigured).toBe(false);
  });

  it("keeps branch processing methods in the follow-up flow", () => {
    const option = getProcessingMethodOption(
      "FILE_LIST",
      "branch_by_file_type",
    );

    const result = deriveProcessingMethodSelectionIntent({
      currentDataTypeKey: "FILE_LIST",
      mappingRules: MAPPING_RULES,
      option,
      selectionResult: createSelectionResult(option),
    });

    expect(result.nextChoiceNodeType).toBe("CONDITION_BRANCH");
    expect(result.nextStep).toBe("follow-up");
    expect(result.isConfigured).toBe(false);
    expect(result.hasFollowUp).toBe(true);
  });
});
