import { type SourceTargetOptionItemResponse } from "@/entities/workflow";

export type SourceTargetPickerValue = {
  customValues?: string[];
  keyword: string;
  option: SourceTargetOptionItemResponse | null;
  selectedOptions?: SourceTargetOptionItemResponse[];
  value: string;
};

export const createEmptySourceTargetPickerValue =
  (): SourceTargetPickerValue => ({
    keyword: "",
    option: null,
    value: "",
  });

export const TARGET_SCHEMA_LABELS: Record<string, string> = {
  category_picker: "게시판",
  channel_picker: "채널",
  course_picker: "과목",
  day_picker: "요일",
  email_picker: "이메일",
  file_picker: "파일",
  feed_source_picker: "뉴스/글 출처",
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
  "category_picker",
  "course_picker",
  "feed_source_picker",
  "term_picker",
  "file_picker",
  "folder_picker",
  "label_picker",
  "sheet_picker",
]);

const DEFAULT_KEYWORD_LABEL = "포함할 단어";
const DEFAULT_KEYWORD_PLACEHOLDER = "예: 인공지능, 교육, 정책";
const DEFAULT_KEYWORD_HELPER_TEXT = "비워두면 최신 글을 모두 가져옵니다.";

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

export const getTargetSchemaHelperText = (
  targetSchema: Record<string, unknown>,
) =>
  typeof targetSchema.helper_text === "string"
    ? targetSchema.helper_text
    : null;

export const isTargetKeywordSupported = (
  targetSchema: Record<string, unknown>,
) => targetSchema.keyword_supported === true;

export const getTargetKeywordLabel = (targetSchema: Record<string, unknown>) =>
  typeof targetSchema.keyword_label === "string"
    ? targetSchema.keyword_label
    : DEFAULT_KEYWORD_LABEL;

export const getTargetKeywordPlaceholder = (
  targetSchema: Record<string, unknown>,
) =>
  typeof targetSchema.keyword_placeholder === "string"
    ? targetSchema.keyword_placeholder
    : DEFAULT_KEYWORD_PLACEHOLDER;

export const getTargetKeywordHelperText = (
  targetSchema: Record<string, unknown>,
) =>
  typeof targetSchema.keyword_helper_text === "string"
    ? targetSchema.keyword_helper_text
    : DEFAULT_KEYWORD_HELPER_TEXT;

export const getTargetSchemaValidation = (
  targetSchema: Record<string, unknown>,
) =>
  typeof targetSchema.validation === "string" ? targetSchema.validation : null;

export const getTargetSchemaValidationMessage = (
  targetSchema: Record<string, unknown>,
  value: string,
) => {
  if (getTargetSchemaValidation(targetSchema) !== "url" || !value.trim()) {
    return null;
  }

  return isValidHttpsUrl(value)
    ? null
    : "https://로 시작하는 사이트 주소를 입력해주세요.";
};

export const hasTargetSchema = (targetSchema: Record<string, unknown>) =>
  Object.keys(targetSchema).length > 0;

export const isRemoteTargetPicker = (targetSchema: Record<string, unknown>) =>
  REMOTE_TARGET_SCHEMA_TYPES.has(getTargetSchemaType(targetSchema));

const isValidHttpsUrl = (value: string) => {
  try {
    const parsedUrl = new URL(value.trim());
    return parsedUrl.protocol === "https:" && Boolean(parsedUrl.hostname);
  } catch {
    return false;
  }
};
