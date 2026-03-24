import type { IconType } from "react-icons";
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

import type { NodeCategory, NodeConfig, NodeType } from "./types";

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
      spreadsheetId: null,
      sheetName: null,
      action: null,
      range: null,
    },
  },

  "web-scraping": {
    type: "web-scraping",
    label: "웹 스크래핑",
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
  },

  // ── 프로세싱 & 로직 ──────────────────────────────────────
  trigger: {
    type: "trigger",
    label: "트리거",
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
  },

  filter: {
    type: "filter",
    label: "필터",
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
  },

  loop: {
    type: "loop",
    label: "반복",
    category: "processing",
    iconComponent: MdLoop,
    color: "nodeColor.loop",
    defaultConfig: {
      isConfigured: false,
      targetField: null,
      maxIterations: 100,
      timeout: 300,
    },
  },

  condition: {
    type: "condition",
    label: "조건 분기",
    category: "processing",
    iconComponent: MdCallSplit,
    color: "nodeColor.condition",
    defaultConfig: {
      isConfigured: false,
      field: null,
      operator: null,
      value: null,
    },
  },

  "multi-output": {
    type: "multi-output",
    label: "다중 출력",
    category: "processing",
    iconComponent: MdCallMade,
    color: "nodeColor.multiOutput",
    defaultConfig: {
      isConfigured: false,
      outputCount: 2,
      conditions: [],
    },
  },

  "data-process": {
    type: "data-process",
    label: "데이터 처리",
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
  },

  "output-format": {
    type: "output-format",
    label: "출력 포맷",
    category: "processing",
    iconComponent: MdArticle,
    color: "nodeColor.outputFormat",
    defaultConfig: {
      isConfigured: false,
      format: null,
      template: null,
    },
  },

  "early-exit": {
    type: "early-exit",
    label: "조기 종료",
    category: "processing",
    iconComponent: MdExitToApp,
    color: "nodeColor.earlyExit",
    defaultConfig: {
      isConfigured: false,
      condition: null,
      exitMessage: null,
    },
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
  },

  // ── AI ───────────────────────────────────────────────────
  llm: {
    type: "llm",
    label: "AI 처리",
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
  },
};

// ─── 카테고리별 노드 목록 조회 헬퍼 ────────────────────────
export const getNodesByCategory = (category: NodeCategory): NodeMeta[] =>
  Object.values(NODE_REGISTRY).filter((meta) => meta.category === category);
