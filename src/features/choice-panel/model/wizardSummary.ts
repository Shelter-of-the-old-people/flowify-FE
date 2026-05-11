import { type DataType } from "@/entities/node";

import { type MappingAction, type MappingRules } from "./types";

export const OUTPUT_DATA_LABELS: Record<DataType, string> = {
  "file-list": "파일 목록",
  "single-file": "단일 파일",
  text: "텍스트",
  spreadsheet: "스프레드시트 데이터",
  "email-list": "이메일 목록",
  "single-email": "단일 이메일",
  "article-list": "글 목록",
  "schedule-data": "일정 데이터",
  "api-response": "API 응답",
};

export const findActionById = (
  mappingRules: MappingRules,
  actionId: string | null | undefined,
): MappingAction | null => {
  if (!actionId) return null;

  for (const dataType of Object.values(mappingRules.data_types)) {
    const action = dataType.actions.find(
      (candidate) => candidate.id === actionId,
    );
    if (action) {
      return action;
    }
  }

  return null;
};

export const readSelectionSummary = (
  action: MappingAction | null,
  selections: Record<string, string | string[]> | null | undefined,
): string[] => {
  if (!action || !selections) return [];

  const optionLookup = new Map<string, string>();
  for (const option of action.follow_up?.options ?? []) {
    optionLookup.set(option.id, option.label);
  }
  for (const option of action.branch_config?.options ?? []) {
    optionLookup.set(option.id, option.label);
  }

  return Object.entries(selections)
    .filter(([key]) => !key.includes(":"))
    .flatMap(([, value]) => {
      if (Array.isArray(value)) {
        return value.map((entry) => optionLookup.get(entry) ?? entry);
      }

      return optionLookup.get(value) ?? value;
    });
};

export const readCustomInputs = (
  selections: Record<string, string | string[]> | null | undefined,
): string[] => {
  if (!selections) return [];

  return Object.entries(selections)
    .filter(([key]) => key.includes(":"))
    .map(([, value]) => value)
    .filter((value): value is string => typeof value === "string")
    .filter((value) => value.trim().length > 0);
};
