import { type NodeType } from "@/entities/node";
import {
  type ChoiceBranchConfig,
  type ChoiceFollowUp,
  type NodeSelectionResult,
} from "@/entities/workflow";
import {
  MAPPING_NODE_TYPE_MAP,
  type MappingDataTypeKey,
  type MappingRules,
  type ResolvedChoiceOption,
  type ResolvedChoiceResponse,
  buildFallbackChoiceResponse,
} from "@/features/choice-panel";

const isMappingDataTypeKey = (
  mappingRules: MappingRules,
  value: string | null | undefined,
): value is MappingDataTypeKey =>
  Boolean(value && value in mappingRules.data_types);

const toChoiceNodeType = (value: string | null | undefined): NodeType =>
  value && value in MAPPING_NODE_TYPE_MAP
    ? MAPPING_NODE_TYPE_MAP[value as keyof typeof MAPPING_NODE_TYPE_MAP]
    : "data-process";

export type ProcessingMethodSelectionIntent = {
  isConfigured: boolean;
  nextActionChoice: ResolvedChoiceResponse;
  nextDataTypeKey: MappingDataTypeKey;
  nextNodeType: NodeType;
  nextStep: "action" | "complete";
};

export type ActionSelectionIntent = {
  branchConfig: ChoiceBranchConfig | null;
  followUp: ChoiceFollowUp | null;
  hasFollowUp: boolean;
  nextDataTypeKey: MappingDataTypeKey;
  nextNodeType: NodeType;
  nextStep: "follow-up" | "complete";
  shouldUseActionLeaf: boolean;
};

export const deriveProcessingMethodSelectionIntent = ({
  currentDataTypeKey,
  mappingRules,
  option,
  selectionResult,
}: {
  currentDataTypeKey: MappingDataTypeKey;
  mappingRules: MappingRules;
  option: ResolvedChoiceOption;
  selectionResult: NodeSelectionResult;
}): ProcessingMethodSelectionIntent => {
  const nextDataTypeKey = isMappingDataTypeKey(
    mappingRules,
    selectionResult.outputDataType,
  )
    ? selectionResult.outputDataType
    : isMappingDataTypeKey(mappingRules, option.output_data_type)
      ? option.output_data_type
      : currentDataTypeKey;

  const nextActionChoice = buildFallbackChoiceResponse(
    mappingRules,
    nextDataTypeKey,
    "action",
  );
  const nextStep = nextActionChoice.options.length > 0 ? "action" : "complete";

  return {
    isConfigured: nextStep === "complete",
    nextActionChoice,
    nextDataTypeKey,
    nextNodeType: selectionResult.nodeType
      ? toChoiceNodeType(selectionResult.nodeType)
      : toChoiceNodeType(option.node_type),
    nextStep,
  };
};

export const deriveActionSelectionIntent = ({
  currentDataTypeKey,
  mappingRules,
  option,
  selectionResult,
  stagingNodeType,
}: {
  currentDataTypeKey: MappingDataTypeKey;
  mappingRules: MappingRules;
  option: ResolvedChoiceOption;
  selectionResult: NodeSelectionResult;
  stagingNodeType: NodeType;
}): ActionSelectionIntent => {
  const nextDataTypeKey = isMappingDataTypeKey(
    mappingRules,
    selectionResult.outputDataType,
  )
    ? selectionResult.outputDataType
    : isMappingDataTypeKey(mappingRules, option.output_data_type)
      ? option.output_data_type
      : currentDataTypeKey;

  const followUp = selectionResult.followUp ?? option.followUp ?? null;
  const branchConfig =
    selectionResult.branchConfig ?? option.branchConfig ?? null;
  const hasFollowUp = Boolean(followUp || branchConfig);

  return {
    branchConfig,
    followUp,
    hasFollowUp,
    nextDataTypeKey,
    nextNodeType: selectionResult.nodeType
      ? toChoiceNodeType(selectionResult.nodeType)
      : toChoiceNodeType(option.node_type),
    nextStep: hasFollowUp ? "follow-up" : "complete",
    shouldUseActionLeaf: stagingNodeType === "loop",
  };
};
