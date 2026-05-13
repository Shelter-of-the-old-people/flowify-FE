export const GOOGLE_SHEETS_WRITE_MODE_OPTIONS = [
  {
    value: "append_rows",
    label: "행 추가",
    description: "기존 내용 아래에 새 행을 계속 추가합니다.",
  },
  {
    value: "overwrite_range",
    label: "범위 덮어쓰기",
    description: "선택한 범위를 새 결과로 통째로 바꿉니다.",
  },
  {
    value: "update_row_by_key",
    label: "기존 행만 수정",
    description:
      "기준 컬럼 값이 같은 기존 행을 찾아, 들어온 컬럼만 부분 수정합니다.",
  },
  {
    value: "upsert_row_by_key",
    label: "있으면 수정, 없으면 추가",
    description:
      "기준 컬럼 값이 같은 행이 있으면 수정하고, 없으면 새 행을 추가합니다.",
  },
] as const;

export const GOOGLE_SHEETS_INITIAL_SYNC_OPTIONS = [
  {
    value: "skip_existing",
    label: "기존 행 건너뛰기",
    description:
      "현재 있는 행은 무시하고, 이후에 들어오는 변경분만 처리합니다.",
  },
  {
    value: "emit_existing",
    label: "기존 행도 처리",
    description:
      "첫 실행에서 현재 있는 행도 한 번 처리하고, 다음부터는 변경분만 읽습니다.",
  },
] as const;

export const getGoogleSheetsWriteModePresentation = (value: string) =>
  GOOGLE_SHEETS_WRITE_MODE_OPTIONS.find((option) => option.value === value) ?? {
    value,
    label: value,
    description: "선택한 방식으로 시트와 결과를 결합합니다.",
  };

export const getGoogleSheetsInitialSyncPresentation = (value: string) =>
  GOOGLE_SHEETS_INITIAL_SYNC_OPTIONS.find(
    (option) => option.value === value,
  ) ?? {
    value,
    label: value,
    description: "",
  };

export const getGoogleSheetsSourceModeDescription = (mode: string) => {
  if (mode === "sheet_all") {
    return "선택한 시트 범위를 있는 그대로 읽어 다음 단계로 전달합니다.";
  }

  if (mode === "new_row") {
    return "마지막 성공 실행 이후 새로 추가된 행만 찾아 다음 단계로 전달합니다.";
  }

  if (mode === "row_updated") {
    return "기준 컬럼으로 같은 행을 찾고, 내용이 바뀐 행만 감지해서 전달합니다.";
  }

  return "선택한 Google Sheets 데이터를 읽어 다음 단계에서 사용할 수 있게 준비합니다.";
};

export const getGoogleSheetsActionDescription = (action: string) => {
  if (action === "read_range") {
    return "선택한 범위를 그대로 읽어 다음 데이터로 전달합니다.";
  }

  if (action === "search_text") {
    return "지정한 텍스트가 들어간 행만 찾아 다음 단계로 전달합니다.";
  }

  if (action === "lookup_row_by_key") {
    return "기준 컬럼 값이 같은 한 행을 찾아 참조 데이터처럼 사용합니다.";
  }

  return "선택한 방식으로 Google Sheets 데이터를 읽습니다.";
};
