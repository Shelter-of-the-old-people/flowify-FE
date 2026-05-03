import { type SourceTargetOptionItemResponse } from "@/entities/workflow";

export type SourceTargetPickerValue = {
  option: SourceTargetOptionItemResponse | null;
  value: string;
};

export const createEmptySourceTargetPickerValue =
  (): SourceTargetPickerValue => ({
    option: null,
    value: "",
  });

export const TARGET_SCHEMA_LABELS: Record<string, string> = {
  channel_picker: "채널",
  course_picker: "과목",
  day_picker: "요일",
  email_picker: "이메일",
  file_picker: "파일",
  folder_picker: "폴더",
  label_picker: "라벨",
  page_picker: "페이지",
  sheet_picker: "시트",
  term_picker: "학기",
  text_input: "대상",
  time_picker: "시간",
};

export const DAY_PICKER_OPTIONS = [
  { label: "월요일", value: "monday" },
  { label: "화요일", value: "tuesday" },
  { label: "수요일", value: "wednesday" },
  { label: "목요일", value: "thursday" },
  { label: "금요일", value: "friday" },
  { label: "토요일", value: "saturday" },
  { label: "일요일", value: "sunday" },
] as const;

const REMOTE_TARGET_SCHEMA_TYPES = new Set([
  "course_picker",
  "term_picker",
  "file_picker",
  "folder_picker",
]);

export const getTargetSchemaType = (targetSchema: Record<string, unknown>) =>
  typeof targetSchema.type === "string" ? targetSchema.type : "text_input";

export const getTargetSchemaLabel = (targetSchema: Record<string, unknown>) =>
  TARGET_SCHEMA_LABELS[getTargetSchemaType(targetSchema)] ?? "대상";

export const getTargetSchemaPlaceholder = (
  targetSchema: Record<string, unknown>,
) =>
  typeof targetSchema.placeholder === "string"
    ? targetSchema.placeholder
    : `${getTargetSchemaLabel(targetSchema)} 입력`;

export const hasTargetSchema = (targetSchema: Record<string, unknown>) =>
  Object.keys(targetSchema).length > 0;

export const isRemoteTargetPicker = (targetSchema: Record<string, unknown>) =>
  REMOTE_TARGET_SCHEMA_TYPES.has(getTargetSchemaType(targetSchema));
