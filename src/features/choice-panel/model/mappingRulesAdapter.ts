import { type MappingRulesResponse } from "@/entities/workflow";

import { MAPPING_RULES } from "./mappingRules";
import {
  type ApplicableWhen,
  type BranchConfig,
  type DataTypeMapping,
  type FollowUp,
  type FollowUpOption,
  type MappingAction,
  type MappingDataTypeKey,
  type MappingNodeType,
  type MappingRules,
  type ProcessingMethod,
  type ProcessingMethodOption,
} from "./types";

const isMappingNodeType = (value: string): value is MappingNodeType =>
  value in MAPPING_RULES.node_types;

const toFollowUpOption = (
  option: NonNullable<
    NonNullable<
      MappingRulesResponse["data_types"][string]["actions"][number]["follow_up"]
    >["options"]
  >[number],
): FollowUpOption => ({
  id: option.id,
  label: option.label,
  type:
    option.type === "number_input" || option.type === "text_input"
      ? option.type
      : undefined,
});

const toFollowUp = (
  config:
    | MappingRulesResponse["data_types"][string]["actions"][number]["follow_up"]
    | MappingRulesResponse["data_types"][string]["actions"][number]["branch_config"]
    | undefined,
): FollowUp | BranchConfig | undefined =>
  config
    ? {
        question: config.question,
        options: config.options?.map(toFollowUpOption),
        options_source:
          config.options_source === "fields_from_data" ||
          config.options_source === "fields_from_service"
            ? config.options_source
            : undefined,
        multi_select: config.multi_select ?? undefined,
        description: config.description ?? undefined,
      }
    : undefined;

const toApplicableWhen = (
  applicableWhen:
    | MappingRulesResponse["data_types"][string]["actions"][number]["applicable_when"]
    | undefined,
): ApplicableWhen | undefined => {
  if (!applicableWhen) {
    return undefined;
  }

  const fileSubtype = applicableWhen.file_subtype;
  return Array.isArray(fileSubtype) &&
    fileSubtype.every((value) => typeof value === "string")
    ? { file_subtype: fileSubtype }
    : undefined;
};

const toProcessingMethodOption = (
  option: MappingRulesResponse["data_types"][string]["processing_method"]["options"][number],
  fallback: ProcessingMethodOption,
): ProcessingMethodOption => ({
  id: option.id,
  label: option.label,
  node_type:
    option.node_type && isMappingNodeType(option.node_type)
      ? option.node_type
      : fallback.node_type,
  output_data_type:
    option.output_data_type &&
    option.output_data_type in MAPPING_RULES.data_types
      ? (option.output_data_type as MappingDataTypeKey)
      : fallback.output_data_type,
  priority: option.priority ?? fallback.priority,
});

const toProcessingMethod = (
  dataTypeKey: MappingDataTypeKey,
  processingMethod:
    | MappingRulesResponse["data_types"][string]["processing_method"]
    | undefined,
): ProcessingMethod | undefined => {
  if (!processingMethod) {
    return undefined;
  }

  const fallbackOptions =
    MAPPING_RULES.data_types[dataTypeKey].processing_method?.options ?? [];

  return {
    question: processingMethod.question,
    options: processingMethod.options.map((option, index) =>
      toProcessingMethodOption(
        option,
        fallbackOptions[index] ?? fallbackOptions[0],
      ),
    ),
  };
};

const toAction = (
  action: MappingRulesResponse["data_types"][string]["actions"][number],
  fallback: MappingAction,
): MappingAction => ({
  id: action.id,
  label: action.label,
  node_type:
    action.node_type && isMappingNodeType(action.node_type)
      ? action.node_type
      : fallback.node_type,
  output_data_type:
    action.output_data_type &&
    action.output_data_type in MAPPING_RULES.data_types
      ? (action.output_data_type as MappingDataTypeKey)
      : fallback.output_data_type,
  priority: action.priority ?? fallback.priority,
  description: action.description ?? fallback.description,
  applicable_when: toApplicableWhen(action.applicable_when),
  follow_up: toFollowUp(action.follow_up) as FollowUp | undefined,
  branch_config: toFollowUp(action.branch_config) as BranchConfig | undefined,
});

const toDataTypeMapping = (
  dataTypeKey: MappingDataTypeKey,
  dataType: MappingRulesResponse["data_types"][string] | undefined,
): DataTypeMapping => {
  const fallback = MAPPING_RULES.data_types[dataTypeKey];

  if (!dataType) {
    return fallback;
  }

  return {
    label: dataType.label,
    description: dataType.description,
    requires_processing_method: dataType.requires_processing_method,
    processing_method: toProcessingMethod(
      dataTypeKey,
      dataType.processing_method,
    ),
    actions: dataType.actions.map((action, index) =>
      toAction(action, fallback.actions[index] ?? fallback.actions[0]),
    ),
  };
};

export const toChoiceMappingRules = (
  response: MappingRulesResponse,
): MappingRules => ({
  data_types: {
    FILE_LIST: toDataTypeMapping("FILE_LIST", response.data_types.FILE_LIST),
    SINGLE_FILE: toDataTypeMapping(
      "SINGLE_FILE",
      response.data_types.SINGLE_FILE,
    ),
    EMAIL_LIST: toDataTypeMapping("EMAIL_LIST", response.data_types.EMAIL_LIST),
    SINGLE_EMAIL: toDataTypeMapping(
      "SINGLE_EMAIL",
      response.data_types.SINGLE_EMAIL,
    ),
    SPREADSHEET_DATA: toDataTypeMapping(
      "SPREADSHEET_DATA",
      response.data_types.SPREADSHEET_DATA,
    ),
    API_RESPONSE: toDataTypeMapping(
      "API_RESPONSE",
      response.data_types.API_RESPONSE,
    ),
    SCHEDULE_DATA: toDataTypeMapping(
      "SCHEDULE_DATA",
      response.data_types.SCHEDULE_DATA,
    ),
    TEXT: toDataTypeMapping("TEXT", response.data_types.TEXT),
  },
  node_types: {
    LOOP: response.node_types.LOOP ?? MAPPING_RULES.node_types.LOOP,
    CONDITION_BRANCH:
      response.node_types.CONDITION_BRANCH ??
      MAPPING_RULES.node_types.CONDITION_BRANCH,
    AI: response.node_types.AI ?? MAPPING_RULES.node_types.AI,
    DATA_FILTER:
      response.node_types.DATA_FILTER ?? MAPPING_RULES.node_types.DATA_FILTER,
    AI_FILTER:
      response.node_types.AI_FILTER ?? MAPPING_RULES.node_types.AI_FILTER,
    PASSTHROUGH:
      response.node_types.PASSTHROUGH ?? MAPPING_RULES.node_types.PASSTHROUGH,
  },
  service_fields: response.service_fields,
});
