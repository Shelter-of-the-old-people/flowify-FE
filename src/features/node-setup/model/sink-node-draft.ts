import { type FlowNodeData } from "@/entities/node";
import { type SinkSchemaFieldResponse } from "@/entities/workflow";

import {
  type SinkNodeConfigDraftParameters,
  type SinkSetupDraftValues,
} from "./types";

export const REMOTE_SINK_PICKER_FIELD_TYPES = new Set([
  "folder_picker",
  "channel_picker",
  "page_picker",
]);

export const getSinkAuxiliaryLabelKey = (fieldKey: string) =>
  `${fieldKey}_label`;

export const getSinkAuxiliaryMetaKey = (fieldKey: string) => `${fieldKey}_meta`;

export const isRemoteSinkPickerField = (fieldType: string) =>
  REMOTE_SINK_PICKER_FIELD_TYPES.has(fieldType);

export const getSinkAuxiliaryFieldKeys = (fields: SinkSchemaFieldResponse[]) =>
  fields.flatMap((field) =>
    isRemoteSinkPickerField(field.type)
      ? [
          getSinkAuxiliaryLabelKey(field.key),
          getSinkAuxiliaryMetaKey(field.key),
        ]
      : [],
  );

export const getInitialSinkDraftValues = (
  fields: SinkSchemaFieldResponse[],
  config: Record<string, unknown>,
): SinkSetupDraftValues =>
  Object.fromEntries(
    fields.map((field) => {
      const rawValue = config[field.key];
      const stringValue =
        typeof rawValue === "string" || typeof rawValue === "number"
          ? String(rawValue)
          : "";

      return [field.key, stringValue];
    }),
  );

export const getInitialSinkAuxiliaryDraftValues = (
  fields: SinkSchemaFieldResponse[],
  config: Record<string, unknown>,
) => {
  const entries = getSinkAuxiliaryFieldKeys(fields)
    .map((key) => [key, config[key]] as const)
    .filter(([, value]) => value !== undefined && value !== null);

  return Object.fromEntries(entries);
};

export const normalizeSinkDraftValue = (
  field: SinkSchemaFieldResponse,
  value: string,
): string | number | undefined => {
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return undefined;
  }

  if (field.type === "number") {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }

  return value;
};

export const validateSinkNodeSetupDraft = (
  draftValues: SinkSetupDraftValues,
  fields: SinkSchemaFieldResponse[],
) => {
  const validationErrors: Record<string, string> = {};

  fields.forEach((field) => {
    const rawValue = draftValues[field.key] ?? "";
    const trimmedValue = rawValue.trim();

    if (field.type !== "number" || trimmedValue.length === 0) {
      return;
    }

    const parsedValue = Number(rawValue);
    if (!Number.isFinite(parsedValue)) {
      validationErrors[field.key] =
        `${field.label} 항목에는 올바른 숫자를 입력해 주세요.`;
    }
  });

  return validationErrors;
};

export const isSinkNodeSetupComplete = (
  config: FlowNodeData["config"],
  fields: SinkSchemaFieldResponse[],
) =>
  fields
    .filter((field) => field.required)
    .every((field) => {
      const value = (config as Record<string, unknown>)[field.key];
      return (
        value !== undefined && value !== null && String(value).trim() !== ""
      );
    });

export const buildSinkNodeConfigDraft = ({
  auxiliaryDraftValues,
  currentConfig,
  draftValues,
  fields,
}: SinkNodeConfigDraftParameters): FlowNodeData["config"] => {
  const schemaFieldKeys = new Set(fields.map((field) => field.key));
  const auxiliaryFieldKeys = new Set(getSinkAuxiliaryFieldKeys(fields));
  const preservedConfigEntries = Object.entries(
    currentConfig as Record<string, unknown>,
  ).filter(
    ([key]) =>
      !schemaFieldKeys.has(key) &&
      !auxiliaryFieldKeys.has(key) &&
      key !== "isConfigured",
  );
  const nextConfig = Object.fromEntries(preservedConfigEntries) as Record<
    string,
    unknown
  >;

  fields.forEach((field) => {
    const normalizedValue = normalizeSinkDraftValue(
      field,
      draftValues[field.key] ?? "",
    );
    if (normalizedValue !== undefined) {
      nextConfig[field.key] = normalizedValue;
    }
  });

  fields.forEach((field) => {
    if (!isRemoteSinkPickerField(field.type)) {
      return;
    }

    const pickerValue = draftValues[field.key]?.trim() ?? "";
    if (pickerValue.length === 0) {
      return;
    }

    [getSinkAuxiliaryLabelKey(field.key), getSinkAuxiliaryMetaKey(field.key)]
      .map((key) => [key, auxiliaryDraftValues[key]] as const)
      .forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          nextConfig[key] = value;
        }
      });
  });

  const configuredConfig = {
    ...nextConfig,
    isConfigured: false,
  } as FlowNodeData["config"];

  return {
    ...configuredConfig,
    isConfigured: isSinkNodeSetupComplete(configuredConfig, fields),
  } as FlowNodeData["config"];
};
