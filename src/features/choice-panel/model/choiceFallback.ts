import {
  type ChoiceBranchConfig,
  type ChoiceFollowUp,
  type ChoiceOption,
  type ChoiceResponse,
} from "@/entities/workflow";

import {
  type FollowUp,
  type MappingAction,
  type MappingDataTypeKey,
  type MappingRules,
  type ProcessingMethodOption,
} from "./types";

export type ResolvedChoiceOption = ChoiceOption & {
  description?: string;
  followUp?: ChoiceFollowUp | null;
  branchConfig?: ChoiceBranchConfig | null;
};

export type ResolvedChoiceResponse = {
  question: string;
  options: ResolvedChoiceOption[];
  requiresProcessingMethod: boolean;
  multiSelect?: boolean | null;
};

export type ChoiceResolutionSource = "server" | "fallback" | null;

type ChoiceResolutionResult = {
  choice: ResolvedChoiceResponse | null;
  source: ChoiceResolutionSource;
};

type FallbackChoiceMode = "initial" | "action";

type ChoiceQuestionConfig = {
  question: string;
  options?: Array<{
    id: string;
    label: string;
    type?: string | null;
  }> | null;
  options_source?: string | null;
  multi_select?: boolean | null;
  description?: string | null;
};

const toChoiceFollowUp = (followUp: FollowUp | null | undefined) =>
  followUp
    ? {
        question: followUp.question,
        options: (followUp.options ?? []).map((option) => ({
          id: option.id,
          label: option.label,
          type: option.type ?? null,
        })),
        options_source: followUp.options_source ?? null,
        multi_select: followUp.multi_select ?? null,
        description: followUp.description ?? null,
      }
    : null;

const toChoiceBranchConfig = (
  branchConfig: ChoiceQuestionConfig | null | undefined,
) =>
  branchConfig
    ? {
        question: branchConfig.question,
        options: (branchConfig.options ?? []).map((option) => ({
          id: option.id,
          label: option.label,
          type: option.type ?? null,
        })),
        options_source: branchConfig.options_source ?? null,
        multi_select: branchConfig.multi_select ?? null,
        description: branchConfig.description ?? null,
      }
    : null;

const toResolvedChoiceOption = (
  option: ChoiceOption | MappingAction | ProcessingMethodOption,
): ResolvedChoiceOption => ({
  id: option.id,
  label: option.label,
  type: "type" in option ? (option.type ?? null) : null,
  node_type: "node_type" in option ? (option.node_type ?? null) : null,
  output_data_type:
    "output_data_type" in option ? (option.output_data_type ?? null) : null,
  priority: "priority" in option ? (option.priority ?? null) : null,
  description: "description" in option ? option.description : undefined,
  followUp:
    "follow_up" in option ? toChoiceFollowUp(option.follow_up ?? null) : null,
  branchConfig:
    "branch_config" in option
      ? toChoiceBranchConfig(option.branch_config ?? null)
      : null,
});

export const toResolvedChoiceResponse = (
  choiceResponse: ChoiceResponse,
): ResolvedChoiceResponse => ({
  question: choiceResponse.question,
  options: choiceResponse.options.map(toResolvedChoiceOption),
  requiresProcessingMethod: choiceResponse.requiresProcessingMethod,
  multiSelect: choiceResponse.multiSelect ?? null,
});

export const buildFallbackChoiceResponse = (
  mappingRules: MappingRules,
  dataTypeKey: MappingDataTypeKey,
  mode: FallbackChoiceMode = "initial",
): ResolvedChoiceResponse => {
  const config = mappingRules.data_types[dataTypeKey];

  if (
    mode === "initial" &&
    config.requires_processing_method &&
    config.processing_method
  ) {
    return {
      question: config.processing_method.question,
      options: config.processing_method.options.map(toResolvedChoiceOption),
      requiresProcessingMethod: true,
      multiSelect: null,
    };
  }

  return {
    question: `${config.label}을 어떻게 처리할까요?`,
    options: config.actions.map(toResolvedChoiceOption),
    requiresProcessingMethod: false,
    multiSelect: null,
  };
};

export const resolveChoiceResponse = ({
  allowFallback,
  fallbackChoice,
  serverChoice,
}: {
  serverChoice?: ChoiceResponse | null;
  fallbackChoice?: ResolvedChoiceResponse | null;
  allowFallback: boolean;
}): ChoiceResolutionResult => {
  if (serverChoice) {
    return {
      choice: toResolvedChoiceResponse(serverChoice),
      source: "server",
    };
  }

  if (allowFallback && fallbackChoice) {
    return {
      choice: fallbackChoice,
      source: "fallback",
    };
  }

  return {
    choice: null,
    source: null,
  };
};

export const resolveInitialChoiceResponse = ({
  allowFallback,
  dataTypeKey,
  mappingRules,
  serverChoice,
}: {
  mappingRules: MappingRules;
  dataTypeKey: MappingDataTypeKey | null;
  serverChoice?: ChoiceResponse | null;
  allowFallback: boolean;
}): ChoiceResolutionResult => {
  const fallbackChoice = dataTypeKey
    ? buildFallbackChoiceResponse(mappingRules, dataTypeKey, "initial")
    : null;

  return resolveChoiceResponse({
    allowFallback,
    serverChoice,
    fallbackChoice,
  });
};

export const resolveActionChoiceResponse = ({
  allowFallback,
  currentDataTypeKey,
  mappingRules,
  serverChoice,
}: {
  mappingRules: MappingRules;
  currentDataTypeKey: MappingDataTypeKey | null;
  serverChoice?: ChoiceResponse | null;
  allowFallback: boolean;
}): ChoiceResolutionResult => {
  if (!currentDataTypeKey) {
    return {
      choice: null,
      source: null,
    };
  }

  const fallbackChoice = buildFallbackChoiceResponse(
    mappingRules,
    currentDataTypeKey,
    "action",
  );

  const shouldFallbackForInvalidServerChoice =
    serverChoice?.requiresProcessingMethod === true;
  const normalizedServerChoice = shouldFallbackForInvalidServerChoice
    ? null
    : serverChoice;

  return resolveChoiceResponse({
    allowFallback: allowFallback || shouldFallbackForInvalidServerChoice,
    serverChoice: normalizedServerChoice,
    fallbackChoice,
  });
};
