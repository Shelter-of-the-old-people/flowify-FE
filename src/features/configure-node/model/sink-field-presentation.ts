import { type SinkSchemaFieldResponse } from "@/entities/workflow";

const DISCORD_SERVICE_KEY = "discord";
const GOOGLE_SHEETS_SERVICE_KEY = "google_sheets";

type SinkFieldPresentation = {
  helpText: string | null;
  inputType: string;
  label: string;
  placeholder: string;
};

type SinkFieldSummaryValueParameters = {
  field: SinkSchemaFieldResponse;
  labelValue: string | null;
  rawValue: unknown;
  serviceKey: string | null | undefined;
};

const FIELD_TYPE_LABELS: Record<string, string> = {
  calendar_picker: "캘린더",
  channel_picker: "채널",
  email_input: "이메일",
  folder_picker: "폴더",
  number: "숫자",
  page_picker: "페이지",
  select: "선택",
  secret_text: "비밀 값",
  sheet_picker: "시트",
  text: "텍스트",
  textarea: "긴 텍스트",
};

const DISCORD_FIELD_PRESENTATIONS: Record<
  string,
  Partial<SinkFieldPresentation>
> = {
  webhook_url: {
    helpText:
      "Discord 채널에서 만든 Webhook 주소를 입력하면 이 채널로 알림이 전송됩니다.",
    inputType: "text",
    label: "Discord 알림 주소",
    placeholder: "Discord Webhook URL을 붙여넣으세요",
  },
  message_template: {
    helpText:
      "비워두면 처리 결과만 전송됩니다. 문구를 입력하면 처리 결과와 함께 전송됩니다.",
    label: "알림에 함께 보낼 문구",
    placeholder: "예: 새 워크플로우 결과가 도착했습니다.",
  },
  username: {
    helpText: "비워두면 Discord Webhook의 기본 이름을 사용합니다.",
    label: "Discord에 표시될 알림 이름",
    placeholder: "예: Flowify 알림",
  },
  avatar_url: {
    helpText: "비워두면 Discord Webhook의 기본 아이콘을 사용합니다.",
    inputType: "text",
    label: "알림 아이콘 이미지 주소",
    placeholder: "https://...",
  },
};

const GOOGLE_SHEETS_FIELD_PRESENTATIONS: Record<
  string,
  Partial<SinkFieldPresentation>
> = {
  spreadsheet_id: {
    helpText:
      "결과를 저장할 스프레드시트 파일을 고릅니다. 원하는 파일이 없으면 바로 만들 수 있습니다.",
    label: "저장할 스프레드시트",
    placeholder: "스프레드시트 선택",
  },
  sheet_name: {
    helpText:
      "선택한 스프레드시트 안에서 실제로 데이터를 넣을 시트 탭 이름입니다.",
    label: "저장할 시트 탭",
    placeholder: "예: InboxStage, Summary",
  },
  range_a1: {
    helpText:
      "덮어쓰기일 때 사용할 범위입니다. 비워두면 시트 시작 위치부터 결과를 씁니다.",
    label: "사용할 범위 (A1)",
    placeholder: "예: A1:F200",
  },
  key_column: {
    helpText: "같은 행을 찾을 기준 컬럼입니다. 예: email, order_id, student_id",
    label: "기준 컬럼",
    placeholder: "예: email",
  },
  write_mode: {
    helpText:
      "결과를 시트에 어떻게 넣을지 선택합니다. 추가 저장인지, 덮어쓰기인지, 기준 컬럼 수정인지 구분됩니다.",
    label: "저장 방식",
    placeholder: "저장 방식 선택",
  },
};

const GOOGLE_SHEETS_FIELD_PRESENTATIONS_UI: Record<
  string,
  Partial<SinkFieldPresentation>
> = {
  spreadsheet_id: {
    helpText:
      "결과를 저장할 스프레드시트 파일입니다. 원하는 파일이 없으면 여기서 바로 만들 수 있습니다.",
    label: "저장할 스프레드시트",
    placeholder: "스프레드시트 선택",
  },
  sheet_name: {
    helpText:
      "선택한 스프레드시트 안에서 실제로 데이터를 읽거나 쓸 시트 탭 이름입니다.",
    label: "저장할 시트 탭",
    placeholder: "예: InboxStage, Summary",
  },
  range_a1: {
    helpText:
      "덮어쓰기, 수정, 업서트에서는 이 범위의 첫 줄을 헤더로 해석합니다. 헤더가 5행이면 A5:F200처럼 헤더 줄부터 포함해 입력하세요.",
    label: "사용할 범위 (A1)",
    placeholder: "예: A1:F200",
  },
  key_column: {
    helpText:
      "같은 행을 찾는 기준 컬럼입니다. 이 컬럼은 입력 데이터와 대상 시트 헤더 양쪽에 모두 있어야 합니다. 예: email, order_id, student_id",
    label: "기준 컬럼",
    placeholder: "예: email",
  },
  write_mode: {
    helpText:
      "결과를 시트에 어떻게 저장할지 선택합니다. 추가 저장인지, 덮어쓰기인지, 기존 행 수정인지 구분합니다.",
    label: "저장 방식",
    placeholder: "저장 방식 선택",
  },
};

const getDefaultFieldInputType = (fieldType: string) => {
  if (fieldType === "email_input") {
    return "email";
  }

  if (fieldType === "number") {
    return "number";
  }

  if (fieldType === "secret_text") {
    return "password";
  }

  return "text";
};

const getDefaultFieldPlaceholder = (fieldType: string) =>
  `${FIELD_TYPE_LABELS[fieldType] ?? fieldType} 입력`;

const getStringValue = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export const getSinkFieldPresentation = (
  serviceKey: string | null | undefined,
  field: SinkSchemaFieldResponse,
): SinkFieldPresentation => {
  const defaultPresentation = {
    helpText: null,
    inputType: getDefaultFieldInputType(field.type),
    label: field.label,
    placeholder: getDefaultFieldPlaceholder(field.type),
  };

  if (serviceKey !== DISCORD_SERVICE_KEY) {
    if (serviceKey !== GOOGLE_SHEETS_SERVICE_KEY) {
      return defaultPresentation;
    }

    const googleSheetsPresentation =
      GOOGLE_SHEETS_FIELD_PRESENTATIONS_UI[field.key] ??
      GOOGLE_SHEETS_FIELD_PRESENTATIONS[field.key];

    return {
      ...defaultPresentation,
      ...googleSheetsPresentation,
    };
  }

  const discordPresentation = DISCORD_FIELD_PRESENTATIONS[field.key];

  return {
    ...defaultPresentation,
    ...discordPresentation,
  };
};

export const getSinkFieldSummaryLabel = (
  serviceKey: string | null | undefined,
  field: SinkSchemaFieldResponse,
) => getSinkFieldPresentation(serviceKey, field).label;

export const getSinkFieldSummaryValue = ({
  field,
  labelValue,
  rawValue,
  serviceKey,
}: SinkFieldSummaryValueParameters) => {
  const stringValue = getStringValue(rawValue);

  if (field.type === "secret_text") {
    return stringValue ? "설정됨" : field.required ? "미설정" : null;
  }

  if (labelValue) {
    return labelValue;
  }

  if (serviceKey === DISCORD_SERVICE_KEY) {
    if (field.key === "message_template") {
      return !stringValue || stringValue === "{{content}}"
        ? "기본값 사용"
        : stringValue;
    }

    if (field.key === "username" || field.key === "avatar_url") {
      return stringValue ?? "기본값 사용";
    }
  }

  if (typeof rawValue === "number") {
    return String(rawValue);
  }

  if (stringValue) {
    return stringValue;
  }

  return field.required ? "미설정" : null;
};

export const shouldShowSinkSchemaPreview = (
  serviceKey: string | null | undefined,
) => serviceKey !== DISCORD_SERVICE_KEY;
