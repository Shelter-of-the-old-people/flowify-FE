import { type SourceTargetOptionItemResponse } from "../api";

const getMetadataStringValue = (
  metadata: Record<string, unknown> | undefined,
  key: string,
) => {
  const value = metadata?.[key];

  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

export const getSourceTargetOptionDisplayLabel = (
  option: SourceTargetOptionItemResponse,
) =>
  getMetadataStringValue(option.metadata, "displayPath") ??
  option.label ??
  option.id;

export const getSourceTargetOptionGroupLabel = (
  option: SourceTargetOptionItemResponse,
) =>
  getMetadataStringValue(option.metadata, "boardName") ??
  option.description ??
  "기타";

export const getSourceTargetOptionItemLabel = (
  option: SourceTargetOptionItemResponse,
) =>
  getMetadataStringValue(option.metadata, "categoryName") ??
  option.label ??
  option.id;

export const isGroupedSourceTargetOptionPicker = (
  serviceKey: string,
  schemaType: string,
) => serviceKey === "web_news" && schemaType === "category_picker";
