import { type FlowNodeData } from "@/entities/node";
import { getSourceTargetOptionDisplayLabel } from "@/entities/workflow";

import { type SourceNodeConfigDraftParameters } from "./setup-types";

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

const hasStringConfigValue = (config: FlowNodeData["config"], key: string) => {
  const value = (config as unknown as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0;
};

const getConfigValue = (config: FlowNodeData["config"], key: string) =>
  (config as unknown as Record<string, unknown>)[key];

const getStringConfigValue = (config: FlowNodeData["config"], key: string) => {
  const value = getConfigValue(config, key);
  return typeof value === "string" ? value : null;
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

  if (!isSourceTargetRequired(targetSchema)) {
    return true;
  }

  return hasStringConfigValue(config, "target");
};

export const buildSourceNodeConfigDraft = ({
  currentConfig,
  targetSchema,
  targetValue,
}: SourceNodeConfigDraftParameters): FlowNodeData["config"] => {
  const target = targetValue.value.trim();
  const currentTarget = getStringConfigValue(currentConfig, "target") ?? "";
  const shouldPreserveTargetSummary =
    !targetValue.option && target.length > 0 && target === currentTarget;
  const preservedTargetLabel = shouldPreserveTargetSummary
    ? getConfigValue(currentConfig, "target_label")
    : null;
  const preservedTargetMeta = shouldPreserveTargetSummary
    ? getConfigValue(currentConfig, "target_meta")
    : null;
  const selectedTargetLabel = targetValue.option
    ? getSourceTargetOptionDisplayLabel(targetValue.option)
    : null;
  const nextConfig = {
    ...currentConfig,
    target,
    target_label:
      selectedTargetLabel ?? preservedTargetLabel ?? (target || null),
    target_meta: targetValue.option?.metadata ?? preservedTargetMeta ?? null,
  } as FlowNodeData["config"] & Record<string, unknown>;
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
