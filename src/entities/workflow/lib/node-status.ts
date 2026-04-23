const NODE_STATUS_FIELD_LABELS: Record<string, string> = {
  account: "계정",
  action: "액션",
  calendar_id: "캘린더",
  channel: "채널",
  date_range: "일정 범위",
  folder_id: "폴더",
  message_format: "메시지 포맷",
  oauth_token: "인증 연결",
  page_id: "페이지",
  recipient: "수신자",
  service: "서비스",
  sheet_name: "시트",
  source_mode: "source mode",
  spreadsheet_id: "스프레드시트",
  target: "대상",
  title: "제목",
};

export const getNodeStatusMissingFieldLabel = (field: string) =>
  NODE_STATUS_FIELD_LABELS[field] ?? field;
