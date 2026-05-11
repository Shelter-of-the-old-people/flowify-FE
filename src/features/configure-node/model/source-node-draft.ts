import { type FlowNodeData } from "@/entities/node";
import {
  getSourceTargetOptionDisplayLabel,
  type SourceTargetOptionItemResponse,
} from "@/entities/workflow";

import { type SourceNodeConfigDraftParameters } from "./setup-types";

const GOOGLE_SHEETS_SERVICE_KEY = "google_sheets";
const DEFAULT_HEADER_ROW = 1;
const DEFAULT_DATA_START_ROW = 2;
const DEFAULT_INITIAL_SYNC_MODE = "skip_existing";

export const createEmptySourceTargetSetupValue = () => ({
  keyword: "",
  option: null,
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
  targetValue,
}: Pick<SourceNodeConfigDraftParameters, "currentConfig" | "targetValue">) => {
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
    const hasTarget = isGoogleSheets
      ? hasStringConfigValue(config, "spreadsheet_id") ||
        hasStringConfigValue(config, "target")
      : hasStringConfigValue(config, "target");

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
