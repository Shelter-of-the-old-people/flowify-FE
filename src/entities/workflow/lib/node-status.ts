const NODE_STATUS_FIELD_LABELS: Record<string, string> = {
  account: "계정",
  action: "액션",
  body_format: "본문 포맷",
  calendar_id: "캘린더",
  channel: "채널",
  date_range: "일정 범위",
  duration_minutes: "기본 소요 시간",
  event_title_template: "일정 제목 템플릿",
  file_format: "파일 형식",
  filename_template: "파일명 규칙",
  folder_id: "폴더",
  message_format: "메시지 포맷",
  oauth_token: "인증 연결",
  page_id: "페이지",
  recipient: "수신자",
  service: "서비스",
  sheet_name: "시트",
  source_mode: "source mode",
  spreadsheet_id: "스프레드시트",
  subject: "제목",
  target: "대상",
  target_id: "페이지/데이터베이스",
  target_type: "저장 위치 유형",
  title: "제목",
  title_template: "제목 템플릿",
  to: "수신자",
  write_mode: "저장 방식",
};

const CONFIG_FIELD_PREFIX = "config.";

export const normalizeNodeStatusFieldKey = (field: string) =>
  field.startsWith(CONFIG_FIELD_PREFIX)
    ? field.slice(CONFIG_FIELD_PREFIX.length)
    : field;

export const getNodeStatusMissingFieldLabel = (field: string) =>
  NODE_STATUS_FIELD_LABELS[normalizeNodeStatusFieldKey(field)] ?? field;
