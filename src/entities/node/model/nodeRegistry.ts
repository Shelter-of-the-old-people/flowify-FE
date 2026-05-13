import { type IconType } from "react-icons";
import {
  MdArticle,
  MdAutoAwesome,
  MdBolt,
  MdCalendarMonth,
  MdCallMade,
  MdCallSplit,
  MdEmail,
  MdExitToApp,
  MdFilterList,
  MdFolder,
  MdLanguage,
  MdLoop,
  MdNotifications,
  MdSettings,
  MdTableChart,
} from "react-icons/md";

import { type DataType } from "./dataType";
import { type NodeCategory, type NodeConfig, type NodeType } from "./types";

// ─── NodeMeta 인터페이스 ─────────────────────────────────────
export interface NodeMeta {
  type: NodeType;
  label: string;
  category: NodeCategory;
  /** react-icons 컴포넌트 */
  iconComponent: IconType;
  /** Chakra UI 시맨틱 토큰 — colorSemanticToken.nodeColor.xxx */
  color: string;
  /** 노드 생성 시 사용할 기본 Config */
  defaultConfig: NodeConfig;
  /** 이 노드가 받아들이는 데이터 타입 (빈 배열 = 시작 노드) */
  defaultInputTypes: DataType[];
  /** 이 노드가 내보내는 데이터 타입 */
  defaultOutputTypes: DataType[];
}

// ─── NODE_REGISTRY ───────────────────────────────────────────
// 새 노드 추가 시 이 파일만 수정하면 됩니다.
export const NODE_REGISTRY: Record<NodeType, NodeMeta> = {
  // ── 도메인 서비스 ────────────────────────────────────────
  communication: {
    type: "communication",
    label: "커뮤니케이션",
    category: "domain",
    iconComponent: MdEmail,
    color: "nodeColor.communication",
    defaultConfig: {
      isConfigured: false,
      service: null,
      account: null,
      channel: null,
      action: null,
      labelFilter: null,
      messageFormat: null,
    },
    defaultInputTypes: [],
    defaultOutputTypes: ["email-list", "text"],
  },

  storage: {
    type: "storage",
    label: "저장소",
    category: "domain",
    iconComponent: MdFolder,
    color: "nodeColor.storage",
    defaultConfig: {
      isConfigured: false,
      service: null,
      targetPath: null,
      action: null,
      permissions: null,
    },
    defaultInputTypes: [],
    defaultOutputTypes: ["file-list", "single-file"],
  },

  spreadsheet: {
    type: "spreadsheet",
    label: "스프레드시트",
    category: "domain",
    iconComponent: MdTableChart,
    color: "nodeColor.spreadsheet",
    defaultConfig: {
      isConfigured: false,
      service: null,
      action: null,
      write_mode: null,
      spreadsheet_id: null,
      sheet_name: null,
      range_a1: null,
      key_column: null,
      header_row: null,
      data_start_row: null,
      initial_sync_mode: null,
      search_source: "value",
      search_field: null,
      search_value: null,
      search_columns: null,
      match_mode: "contains",
      case_sensitive: false,
      result_limit: null,
      lookup_source: "value",
      lookup_field: null,
      lookup_value: null,
      spreadsheetId: null,
      sheetName: null,
      range: null,
    },
    defaultInputTypes: [],
    defaultOutputTypes: ["spreadsheet"],
  },

  "web-scraping": {
    type: "web-scraping",
    label: "웹 수집",
    category: "domain",
    iconComponent: MdLanguage,
    color: "nodeColor.webScraping",
    defaultConfig: {
      isConfigured: false,
      targetUrl: null,
      selector: null,
      outputFields: [],
      pagination: false,
    },
    defaultInputTypes: [],
    defaultOutputTypes: ["api-response"],
  },

  calendar: {
    type: "calendar",
    label: "캘린더",
    category: "domain",
    iconComponent: MdCalendarMonth,
    color: "nodeColor.calendar",
    defaultConfig: {
      isConfigured: false,
      service: null,
      account: null,
      action: null,
      calendarId: null,
      dateRange: null,
    },
    defaultInputTypes: [],
    defaultOutputTypes: ["api-response"],
  },

  // ── 프로세싱 & 로직 ──────────────────────────────────────
  trigger: {
    type: "trigger",
    label: "시작 조건",
    category: "processing",
    iconComponent: MdBolt,
    color: "nodeColor.trigger",
    defaultConfig: {
      isConfigured: false,
      triggerType: null,
      schedule: null,
      eventService: null,
      eventType: null,
    },
    defaultInputTypes: [],
    defaultOutputTypes: [],
  },

  filter: {
    type: "filter",
    label: "걸러내기",
    category: "processing",
    iconComponent: MdFilterList,
    color: "nodeColor.filter",
    defaultConfig: {
      isConfigured: false,
      field: null,
      operator: null,
      value: null,
      removeDuplicates: false,
    },
    defaultInputTypes: [
      "file-list",
      "email-list",
      "article-list",
      "spreadsheet",
      "api-response",
    ],
    defaultOutputTypes: [
      "file-list",
      "email-list",
      "article-list",
      "spreadsheet",
      "api-response",
    ],
  },

  loop: {
    type: "loop",
    label: "하나씩 처리",
    category: "processing",
    iconComponent: MdLoop,
    color: "nodeColor.loop",
    defaultConfig: {
      isConfigured: false,
      targetField: null,
      maxIterations: 100,
      timeout: 300,
    },
    defaultInputTypes: [
      "file-list",
      "email-list",
      "article-list",
      "spreadsheet",
    ],
    defaultOutputTypes: ["single-file", "text", "spreadsheet"],
  },

  condition: {
    type: "condition",
    label: "분류",
    category: "processing",
    iconComponent: MdCallSplit,
    color: "nodeColor.condition",
    defaultConfig: {
      isConfigured: false,
      field: null,
      operator: null,
      value: null,
    },
    defaultInputTypes: [
      "file-list",
      "single-file",
      "text",
      "email-list",
      "article-list",
      "spreadsheet",
      "api-response",
    ],
    defaultOutputTypes: [
      "file-list",
      "single-file",
      "text",
      "email-list",
      "article-list",
      "spreadsheet",
      "api-response",
    ],
  },

  "multi-output": {
    type: "multi-output",
    label: "여러 결과",
    category: "processing",
    iconComponent: MdCallMade,
    color: "nodeColor.multiOutput",
    defaultConfig: {
      isConfigured: false,
      outputCount: 2,
      conditions: [],
    },
    defaultInputTypes: [
      "file-list",
      "single-file",
      "text",
      "email-list",
      "article-list",
      "spreadsheet",
      "api-response",
    ],
    defaultOutputTypes: [
      "file-list",
      "single-file",
      "text",
      "email-list",
      "article-list",
      "spreadsheet",
      "api-response",
    ],
  },

  "data-process": {
    type: "data-process",
    label: "가공",
    category: "processing",
    iconComponent: MdSettings,
    color: "nodeColor.dataProcess",
    defaultConfig: {
      isConfigured: false,
      operation: null,
      field: null,
      sortDirection: null,
      aggregateFunction: null,
    },
    defaultInputTypes: [
      "file-list",
      "single-file",
      "text",
      "email-list",
      "article-list",
      "spreadsheet",
      "api-response",
    ],
    defaultOutputTypes: ["text", "spreadsheet", "api-response"],
  },

  "output-format": {
    type: "output-format",
    label: "형식 변환",
    category: "processing",
    iconComponent: MdArticle,
    color: "nodeColor.outputFormat",
    defaultConfig: {
      isConfigured: false,
      format: null,
      template: null,
    },
    defaultInputTypes: ["text", "spreadsheet", "api-response"],
    defaultOutputTypes: ["text"],
  },

  "early-exit": {
    type: "early-exit",
    label: "중단",
    category: "processing",
    iconComponent: MdExitToApp,
    color: "nodeColor.earlyExit",
    defaultConfig: {
      isConfigured: false,
      condition: null,
      exitMessage: null,
    },
    defaultInputTypes: [
      "file-list",
      "single-file",
      "text",
      "email-list",
      "article-list",
      "spreadsheet",
      "api-response",
    ],
    defaultOutputTypes: [],
  },

  notification: {
    type: "notification",
    label: "알림",
    category: "processing",
    iconComponent: MdNotifications,
    color: "nodeColor.notification",
    defaultConfig: {
      isConfigured: false,
      channel: null,
      recipient: null,
      messageTemplate: null,
    },
    defaultInputTypes: ["text"],
    defaultOutputTypes: [],
  },

  // ── AI ───────────────────────────────────────────────────
  llm: {
    type: "llm",
    label: "AI",
    category: "ai",
    iconComponent: MdAutoAwesome,
    color: "nodeColor.llm",
    defaultConfig: {
      isConfigured: false,
      prompt: "",
      model: null,
      outputFormat: "text",
      temperature: 0.7,
    },
    defaultInputTypes: [
      "file-list",
      "single-file",
      "text",
      "email-list",
      "article-list",
      "spreadsheet",
      "api-response",
    ],
    defaultOutputTypes: ["text"],
  },
};

// ─── 카테고리별 노드 목록 조회 헬퍼 ────────────────────────
export const getNodesByCategory = (category: NodeCategory): NodeMeta[] =>
  Object.values(NODE_REGISTRY).filter((meta) => meta.category === category);
