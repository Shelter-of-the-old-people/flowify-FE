export const SOURCE_TARGET_SCHEMA_LABELS: Record<string, string> = {
  calendar_picker: "캘린더",
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

const REMOTE_SOURCE_TARGET_SCHEMA_TYPES = new Set([
  "calendar_picker",
  "channel_picker",
  "course_picker",
  "file_picker",
  "folder_picker",
  "label_picker",
  "page_picker",
  "sheet_picker",
  "term_picker",
]);

export const getSourceTargetSchemaType = (
  targetSchema: Record<string, unknown>,
) => (typeof targetSchema.type === "string" ? targetSchema.type : "text_input");

export const getSourceTargetSchemaLabel = (
  targetSchema: Record<string, unknown>,
) =>
  SOURCE_TARGET_SCHEMA_LABELS[getSourceTargetSchemaType(targetSchema)] ??
  "대상";

export const getSourceTargetSchemaPlaceholder = (
  targetSchema: Record<string, unknown>,
) =>
  typeof targetSchema.placeholder === "string"
    ? targetSchema.placeholder
    : `${getSourceTargetSchemaLabel(targetSchema)} 입력`;

export const isRemoteSourceTargetPicker = (
  targetSchema: Record<string, unknown>,
) =>
  REMOTE_SOURCE_TARGET_SCHEMA_TYPES.has(
    getSourceTargetSchemaType(targetSchema),
  );
