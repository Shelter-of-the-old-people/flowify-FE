import {
  type DataProcessNodeConfig,
  type FlowNodeData,
  type NodeConfig,
  getTypedConfig,
} from "./types";

const COMMUNICATION_SERVICE_LABEL: Record<string, string> = {
  discord: "Discord",
  gmail: "Gmail",
  slack: "Slack",
};

const STORAGE_SERVICE_LABEL: Record<string, string> = {
  google_drive: "Google Drive",
  notion: "Notion",
};

const WEB_SCRAPING_SOURCE_MODE_LABEL: Record<string, string> = {
  article_search: "네이버 뉴스 검색",
  course_files: "특정 과목 강의자료 전체",
  course_new_file: "과목의 새 강의자료",
  new_articles: "네이버 새 기사",
  seboard_new_posts: "SE Board 새 글",
  seboard_posts: "SE Board 게시글",
  term_all_files: "학기 전체 과목 자료",
  website_feed: "RSS 지원 사이트",
};

const DATA_PROCESS_OPERATION_LABEL: Record<
  NonNullable<DataProcessNodeConfig["operation"]>,
  string
> = {
  aggregate: "집계",
  classify: "분류",
  sort: "정렬",
  transform: "변환",
};

const toDisplayText = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const toDisplayNumber = (value: unknown): string | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
};

const compactLines = (values: Array<string | null | undefined>) =>
  values.filter((value): value is string => Boolean(value));

const joinParts = (values: Array<string | null | undefined>) => {
  const parts = compactLines(values);
  return parts.length > 0 ? parts.join(" / ") : null;
};

const getLabeledValue = (label: string, value: unknown) => {
  const text = toDisplayText(value);
  return text ? `${label}: ${text}` : null;
};

const getChoiceSummary = (config: NodeConfig) => {
  const actionId = toDisplayText(config.choiceActionId);

  if (!actionId) {
    return null;
  }

  if (actionId === "branch_by_file_type") {
    return "파일 종류별 분기";
  }

  return "선택한 방식 적용";
};

export const getNodeSummaryLines = (data: FlowNodeData): string[] => {
  switch (data.type) {
    case "calendar": {
      const config = getTypedConfig("calendar", data.config);
      return compactLines([
        joinParts([
          toDisplayText(config.service),
          toDisplayText(config.action),
        ]),
        getLabeledValue("캘린더", config.calendarId),
        getLabeledValue("기간", config.dateRange),
      ]);
    }
    case "communication": {
      const config = getTypedConfig("communication", data.config);
      return compactLines([
        joinParts([
          config.service ? COMMUNICATION_SERVICE_LABEL[config.service] : null,
          toDisplayText(config.action),
        ]),
        getLabeledValue("채널", config.channel),
      ]);
    }
    case "condition": {
      const config = getTypedConfig("condition", data.config);
      return compactLines([
        getChoiceSummary(config),
        joinParts([
          toDisplayText(config.field),
          toDisplayText(config.operator),
          toDisplayText(config.value),
        ]),
      ]);
    }
    case "data-process": {
      const config = getTypedConfig("data-process", data.config);
      return compactLines([
        config.operation
          ? DATA_PROCESS_OPERATION_LABEL[config.operation]
          : null,
        getLabeledValue("대상", config.field),
      ]);
    }
    case "early-exit": {
      const config = getTypedConfig("early-exit", data.config);
      return compactLines([toDisplayText(config.condition)]);
    }
    case "filter": {
      const config = getTypedConfig("filter", data.config);
      return compactLines([
        joinParts([
          toDisplayText(config.field),
          toDisplayText(config.operator),
          toDisplayText(config.value),
        ]),
      ]);
    }
    case "llm": {
      const config = getTypedConfig("llm", data.config);
      return compactLines([
        getChoiceSummary(config),
        toDisplayText(config.prompt) ? "지시사항 설정됨" : null,
        getLabeledValue("출력", config.outputFormat),
      ]);
    }
    case "loop": {
      const config = getTypedConfig("loop", data.config);
      const maxIterations = toDisplayNumber(config.maxIterations);
      return compactLines([
        getLabeledValue("처리 대상", config.targetField),
        maxIterations ? `최대 ${maxIterations}회` : null,
      ]);
    }
    case "multi-output": {
      const config = getTypedConfig("multi-output", data.config);
      return compactLines([`출력 ${config.outputCount}개`]);
    }
    case "notification": {
      const config = getTypedConfig("notification", data.config);
      return compactLines([
        joinParts([
          toDisplayText(config.channel),
          toDisplayText(config.recipient),
        ]),
      ]);
    }
    case "output-format": {
      const config = getTypedConfig("output-format", data.config);
      const format = toDisplayText(config.format);
      return compactLines([format ? format.toUpperCase() : null]);
    }
    case "spreadsheet": {
      const config = getTypedConfig("spreadsheet", data.config);
      return compactLines([
        toDisplayText(config.sheet_name) ?? toDisplayText(config.sheetName),
        toDisplayText(config.action) ?? toDisplayText(config.write_mode),
      ]);
    }
    case "storage": {
      const config = getTypedConfig("storage", data.config);
      return compactLines([
        joinParts([
          config.service ? STORAGE_SERVICE_LABEL[config.service] : null,
          toDisplayText(config.action),
        ]),
        getLabeledValue("경로", config.targetPath),
      ]);
    }
    case "trigger": {
      const config = getTypedConfig("trigger", data.config);
      return compactLines([
        toDisplayText(config.triggerType),
        toDisplayText(config.schedule) ?? toDisplayText(config.eventType),
      ]);
    }
    case "web-scraping": {
      const config = getTypedConfig("web-scraping", data.config);
      const sourceMode = toDisplayText(config.source_mode);
      const targetLabel =
        toDisplayText(config.target_label) ?? toDisplayText(config.target);

      return compactLines([
        sourceMode
          ? (WEB_SCRAPING_SOURCE_MODE_LABEL[sourceMode] ?? sourceMode)
          : null,
        getLabeledValue("대상", targetLabel),
        toDisplayText(config.targetUrl),
      ]);
    }
    default: {
      const _exhaustive: never = data.type;
      return _exhaustive;
    }
  }
};
