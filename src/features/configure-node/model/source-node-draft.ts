import { type FlowNodeData } from "@/entities/node";
import {
  type SourceTargetOptionItemResponse,
  getSourceTargetOptionDisplayLabel,
} from "@/entities/workflow";

import { type SourceNodeConfigDraftParameters } from "./setup-types";

const GOOGLE_SHEETS_SERVICE_KEY = "google_sheets";
const FEED_SOURCE_PICKER_TYPE = "feed_source_picker";
const DEFAULT_HEADER_ROW = 1;
const DEFAULT_DATA_START_ROW = 2;
const DEFAULT_INITIAL_SYNC_MODE = "skip_existing";

export const createEmptySourceTargetSetupValue = () => ({
  customValues: [],
  keyword: "",
  option: null,
  selectedOptions: [],
  value: "",
});

export const getTargetSchemaType = (targetSchema: Record<string, unknown>) =>
  typeof targetSchema.type === "string" ? targetSchema.type : "text_input";

export const hasTargetSchema = (targetSchema: Record<string, unknown>) =>
  Object.keys(targetSchema).length > 0;

export const isSourceTargetRequired = (
  targetSchema: Record<string, unknown>,
) => {
  if (!hasTargetSchema(targetSchema)) {
    return false;
  }

  return typeof targetSchema.required === "boolean"
    ? targetSchema.required
    : true;
};

const toConfigRecord = (config: FlowNodeData["config"]) =>
  config as unknown as Record<string, unknown>;

const getConfigValue = (config: FlowNodeData["config"], key: string) =>
  toConfigRecord(config)[key];

const getStringConfigValue = (config: FlowNodeData["config"], key: string) => {
  const value = getConfigValue(config, key);
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
};

const hasStringConfigValue = (config: FlowNodeData["config"], key: string) =>
  getStringConfigValue(config, key) !== null;

const getMetadataString = (
  option: SourceTargetOptionItemResponse | null,
  key: string,
) => {
  const value = option?.metadata?.[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
};

const isGoogleSheetsService = (config: FlowNodeData["config"]) =>
  getStringConfigValue(config, "service") === GOOGLE_SHEETS_SERVICE_KEY;

const isFeedSourceTargetSchema = (targetSchema?: Record<string, unknown>) =>
  targetSchema
    ? getTargetSchemaType(targetSchema) === FEED_SOURCE_PICKER_TYPE
    : false;

const uniqueValues = (values: string[]) =>
  Array.from(
    new Set(
      values.map((value) => value.trim()).filter((value) => value.length > 0),
    ),
  );

const getFeedSourceUrl = (option: SourceTargetOptionItemResponse) =>
  option.id.trim();

const getMetadataStringValue = (
  metadata: Record<string, unknown>,
  key: string,
) => {
  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
};

const toFeedSourceMeta = (option: SourceTargetOptionItemResponse) => {
  const metadata = option.metadata ?? {};
  return {
    category: getMetadataStringValue(metadata, "category"),
    homepage: getMetadataStringValue(metadata, "homepage"),
    label: getSourceTargetOptionDisplayLabel(option),
    language: getMetadataStringValue(metadata, "language"),
    presetId: getMetadataStringValue(metadata, "presetId"),
    region: getMetadataStringValue(metadata, "region"),
    sourceType: getMetadataStringValue(metadata, "sourceType"),
    tags: Array.isArray(metadata.tags) ? metadata.tags : [],
    url: getFeedSourceUrl(option),
  };
};

const buildFeedSourceTargetLabel = (
  selectedOptions: SourceTargetOptionItemResponse[],
  customValues: string[],
) => {
  const firstLabel =
    selectedOptions[0] !== undefined
      ? getSourceTargetOptionDisplayLabel(selectedOptions[0])
      : customValues[0];
  const count = selectedOptions.length + customValues.length;

  if (!firstLabel || count === 0) {
    return null;
  }

  return count === 1 ? firstLabel : `${firstLabel} 외 ${count - 1}개`;
};

const buildFeedSourceTargetConfig = ({
  currentConfig,
  targetValue,
}: Pick<SourceNodeConfigDraftParameters, "currentConfig" | "targetValue">) => {
  const selectedOptions = targetValue.selectedOptions ?? [];
  const customValues = uniqueValues(targetValue.customValues ?? []);
  const optionUrls = selectedOptions.map(getFeedSourceUrl);
  const targets = uniqueValues([...optionUrls, ...customValues]);
  const firstTarget = targets[0] ?? "";

  return {
    ...toConfigRecord(currentConfig),
    target: firstTarget,
    target_label: buildFeedSourceTargetLabel(selectedOptions, customValues),
    target_meta: {
      customSources: customValues.map((url) => ({ label: url, url })),
      pickerType: "feed_source",
      selectedSources: selectedOptions.map(toFeedSourceMeta),
    },
    targets,
  } as unknown as FlowNodeData["config"];
};

const buildGoogleSheetsTargetConfig = ({
  currentConfig,
  option,
  target,
}: {
  currentConfig: FlowNodeData["config"];
  option: SourceTargetOptionItemResponse | null;
  target: string;
}) => {
  const spreadsheetId = getMetadataString(option, "spreadsheetId") ?? target;
  const sheetName =
    getMetadataString(option, "sheetName") ??
    getStringConfigValue(currentConfig, "sheet_name");
  const sheetId = option?.metadata?.sheetId;
  const nextConfig: Record<string, unknown> = {
    spreadsheet_id: spreadsheetId,
    sheet_name: sheetName,
    header_row: toConfigRecord(currentConfig).header_row ?? DEFAULT_HEADER_ROW,
    data_start_row:
      toConfigRecord(currentConfig).data_start_row ?? DEFAULT_DATA_START_ROW,
    initial_sync_mode:
      toConfigRecord(currentConfig).initial_sync_mode ??
      DEFAULT_INITIAL_SYNC_MODE,
  };

  if (sheetId !== undefined && sheetId !== null) {
    nextConfig.sheet_id = sheetId;
  }

  return nextConfig;
};

export const buildSourceTargetConfigDraft = ({
  currentConfig,
  targetSchema,
  targetValue,
}: Pick<SourceNodeConfigDraftParameters, "currentConfig" | "targetValue"> & {
  targetSchema?: Record<string, unknown>;
}) => {
  if (isFeedSourceTargetSchema(targetSchema)) {
    return buildFeedSourceTargetConfig({ currentConfig, targetValue });
  }

  const target = targetValue.value.trim();
  const resolvedTarget = isGoogleSheetsService(currentConfig)
    ? (getMetadataString(targetValue.option, "spreadsheetId") ?? target)
    : target;
  const currentTarget = getStringConfigValue(currentConfig, "target") ?? "";
  const shouldPreserveTargetSummary =
    !targetValue.option &&
    resolvedTarget.length > 0 &&
    resolvedTarget === currentTarget;
  const preservedTargetLabel = shouldPreserveTargetSummary
    ? getConfigValue(currentConfig, "target_label")
    : null;
  const preservedTargetMeta = shouldPreserveTargetSummary
    ? getConfigValue(currentConfig, "target_meta")
    : null;
  const selectedTargetLabel = targetValue.option
    ? getSourceTargetOptionDisplayLabel(targetValue.option)
    : null;

  const nextConfig: Record<string, unknown> = {
    ...toConfigRecord(currentConfig),
    target: resolvedTarget,
    target_label:
      selectedTargetLabel ?? preservedTargetLabel ?? (resolvedTarget || null),
    target_meta: targetValue.option?.metadata ?? preservedTargetMeta ?? null,
  };

  if (isGoogleSheetsService(currentConfig)) {
    Object.assign(
      nextConfig,
      buildGoogleSheetsTargetConfig({
        currentConfig,
        option: targetValue.option,
        target,
      }),
    );
  }

  return nextConfig as unknown as FlowNodeData["config"];
};

export const isSourceNodeSetupComplete = (
  config: FlowNodeData["config"],
  targetSchema: Record<string, unknown>,
) => {
  if (!hasStringConfigValue(config, "service")) {
    return false;
  }

  if (!hasStringConfigValue(config, "source_mode")) {
    return false;
  }

  const isGoogleSheets = isGoogleSheetsService(config);

  if (isSourceTargetRequired(targetSchema)) {
    const hasFeedSources =
      isFeedSourceTargetSchema(targetSchema) &&
      Array.isArray(toConfigRecord(config).targets) &&
      (toConfigRecord(config).targets as unknown[]).some(
        (value) => typeof value === "string" && value.trim().length > 0,
      );
    const hasTarget = isGoogleSheets
      ? hasStringConfigValue(config, "spreadsheet_id") ||
        hasStringConfigValue(config, "target")
      : hasStringConfigValue(config, "target") || hasFeedSources;

    if (!hasTarget) {
      return false;
    }
  }

  if (isGoogleSheets) {
    if (!hasStringConfigValue(config, "sheet_name")) {
      return false;
    }

    if (
      getStringConfigValue(config, "source_mode") === "row_updated" &&
      !hasStringConfigValue(config, "key_column")
    ) {
      return false;
    }
  }

  return true;
};

export const buildSourceNodeConfigDraft = ({
  currentConfig,
  targetSchema,
  targetValue,
}: SourceNodeConfigDraftParameters): FlowNodeData["config"] => {
  const nextConfig = buildSourceTargetConfigDraft({
    currentConfig,
    targetSchema,
    targetValue,
  }) as FlowNodeData["config"] & Record<string, unknown>;
  const keyword = targetValue.keyword.trim();

  if (keyword) {
    nextConfig.keyword = keyword;
  } else {
    delete nextConfig.keyword;
  }

  return {
    ...nextConfig,
    isConfigured: isSourceNodeSetupComplete(nextConfig, targetSchema),
  } as FlowNodeData["config"];
};
