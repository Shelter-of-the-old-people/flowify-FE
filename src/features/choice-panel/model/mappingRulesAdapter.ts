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

const SUPPORTED_MAPPING_DATA_TYPE_KEYS = [
  "FILE_LIST",
  "SINGLE_FILE",
  "EMAIL_LIST",
  "SINGLE_EMAIL",
  "SPREADSHEET_DATA",
  "API_RESPONSE",
  "SCHEDULE_DATA",
  "TEXT",
] as const satisfies readonly MappingDataTypeKey[];

const SUPPORTED_MAPPING_NODE_TYPES = [
  "LOOP",
  "CONDITION_BRANCH",
  "AI",
  "DATA_FILTER",
  "AI_FILTER",
  "PASSTHROUGH",
] as const satisfies readonly MappingNodeType[];

type MappingRuleProcessingMethodResponse = NonNullable<
  MappingRulesResponse["data_types"][string]["processing_method"]
>;
type MappingRuleProcessingMethodOptionResponse =
  MappingRuleProcessingMethodResponse["options"][number];

const isMappingDataTypeKey = (
  value: string | null | undefined,
): value is MappingDataTypeKey =>
  Boolean(
    value &&
    (SUPPORTED_MAPPING_DATA_TYPE_KEYS as readonly string[]).includes(value),
  );

const isMappingNodeType = (
  value: string | null | undefined,
): value is MappingNodeType =>
  Boolean(
    value &&
    (SUPPORTED_MAPPING_NODE_TYPES as readonly string[]).includes(value),
  );

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
  option: MappingRuleProcessingMethodOptionResponse,
  fallback: ProcessingMethodOption | undefined,
  defaultOutputDataType: MappingDataTypeKey,
): ProcessingMethodOption => ({
  id: option.id,
  label: option.label,
  node_type: isMappingNodeType(option.node_type)
    ? option.node_type
    : (fallback?.node_type ?? null),
  output_data_type: isMappingDataTypeKey(option.output_data_type)
    ? option.output_data_type
    : (fallback?.output_data_type ?? defaultOutputDataType),
  priority: option.priority ?? fallback?.priority ?? 99,
  branch_config:
    (toFollowUp(option.branch_config ?? undefined) as
      | BranchConfig
      | undefined) ?? fallback?.branch_config,
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

  const fallback = MAPPING_RULES.data_types[dataTypeKey].processing_method;
  const fallbackOptionsById = new Map(
    (fallback?.options ?? []).map((option) => [option.id, option]),
  );
  const options = processingMethod.options.map((option) =>
    toProcessingMethodOption(
      option,
      fallbackOptionsById.get(option.id),
      dataTypeKey,
    ),
  );

  if (options.length === 0) {
    return fallback;
  }

  return {
    question: processingMethod.question || fallback?.question || "",
    options,
  };
};

const toAction = (
  dataTypeKey: MappingDataTypeKey,
  action: MappingRulesResponse["data_types"][string]["actions"][number],
  fallback: MappingAction | undefined,
): MappingAction => ({
  id: action.id,
  label: action.label,
  node_type: isMappingNodeType(action.node_type)
    ? action.node_type
    : (fallback?.node_type ?? "PASSTHROUGH"),
  output_data_type: isMappingDataTypeKey(action.output_data_type)
    ? action.output_data_type
    : (fallback?.output_data_type ?? dataTypeKey),
  priority: action.priority ?? fallback?.priority ?? 99,
  description: action.description ?? fallback?.description,
  applicable_when: toApplicableWhen(action.applicable_when),
  follow_up:
    (toFollowUp(action.follow_up) as FollowUp | undefined) ??
    fallback?.follow_up,
  branch_config:
    (toFollowUp(action.branch_config) as BranchConfig | undefined) ??
    fallback?.branch_config,
});

const toDataTypeMapping = (
  dataTypeKey: MappingDataTypeKey,
  dataType: MappingRulesResponse["data_types"][string] | undefined,
): DataTypeMapping => {
  const fallback = MAPPING_RULES.data_types[dataTypeKey];

  if (!dataType) {
    return fallback;
  }

  const fallbackActionsById = new Map(
    fallback.actions.map((action) => [action.id, action]),
  );
  const actions = dataType.actions.map((action) =>
    toAction(dataTypeKey, action, fallbackActionsById.get(action.id)),
  );

  return {
    label: dataType.label || fallback.label,
    description: dataType.description || fallback.description,
    requires_processing_method: dataType.requires_processing_method,
    processing_method: toProcessingMethod(
      dataTypeKey,
      dataType.processing_method,
    ),
    actions:
      dataType.actions.length > 0 && actions.length === 0
        ? fallback.actions
        : actions,
  };
};

export const toChoiceMappingRules = (
  response?: MappingRulesResponse | null,
): MappingRules => {
  if (!response) {
    return MAPPING_RULES;
  }

  return {
    data_types: {
      FILE_LIST: toDataTypeMapping("FILE_LIST", response.data_types.FILE_LIST),
      SINGLE_FILE: toDataTypeMapping(
        "SINGLE_FILE",
        response.data_types.SINGLE_FILE,
      ),
      EMAIL_LIST: toDataTypeMapping(
        "EMAIL_LIST",
        response.data_types.EMAIL_LIST,
      ),
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
    service_fields:
      Object.keys(response.service_fields ?? {}).length > 0
        ? response.service_fields
        : MAPPING_RULES.service_fields,
  };
};
