import { type NodeType } from "@/entities/node";
import {
  type ChoiceBranchConfig,
  type ChoiceFollowUp,
  type NodeSelectionResult,
} from "@/entities/workflow";
import {
  MAPPING_NODE_TYPE_MAP,
  type MappingDataTypeKey,
  type MappingNodeType,
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

const isMappingNodeType = (
  value: string | null | undefined,
): value is MappingNodeType => Boolean(value && value in MAPPING_NODE_TYPE_MAP);

const toChoiceSemanticNodeType = ({
  option,
  selectionResult,
}: {
  option: ResolvedChoiceOption;
  selectionResult: NodeSelectionResult;
}): MappingNodeType => {
  if (isMappingNodeType(selectionResult.nodeType)) {
    return selectionResult.nodeType;
  }

  if (isMappingNodeType(option.node_type)) {
    return option.node_type;
  }

  throw new Error("Unsupported choice node type");
};

export type ProcessingMethodSelectionIntent = {
  branchConfig: ChoiceBranchConfig | null;
  hasFollowUp: boolean;
  isConfigured: boolean;
  nextActionChoice: ResolvedChoiceResponse;
  nextChoiceNodeType: MappingNodeType;
  nextDataTypeKey: MappingDataTypeKey;
  nextNodeType: NodeType;
  nextStep: "action" | "follow-up" | "complete";
};

export type ActionSelectionIntent = {
  branchConfig: ChoiceBranchConfig | null;
  followUp: ChoiceFollowUp | null;
  hasFollowUp: boolean;
  nextChoiceNodeType: MappingNodeType;
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
  const branchConfig =
    selectionResult.branchConfig ?? option.branchConfig ?? null;
  const nextChoiceNodeType = toChoiceSemanticNodeType({
    option,
    selectionResult,
  });
  const hasFollowUp = Boolean(branchConfig);
  const nextStep = hasFollowUp
    ? "follow-up"
    : nextActionChoice.options.length > 0
      ? "action"
      : "complete";

  return {
    branchConfig,
    hasFollowUp,
    isConfigured: nextStep === "complete",
    nextActionChoice,
    nextChoiceNodeType,
    nextDataTypeKey,
    nextNodeType: toChoiceNodeType(nextChoiceNodeType),
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
  const nextChoiceNodeType = toChoiceSemanticNodeType({
    option,
    selectionResult,
  });

  return {
    branchConfig,
    followUp,
    hasFollowUp,
    nextChoiceNodeType,
    nextDataTypeKey,
    nextNodeType: toChoiceNodeType(nextChoiceNodeType),
    nextStep: hasFollowUp ? "follow-up" : "complete",
    shouldUseActionLeaf: stagingNodeType === "loop",
  };
};
