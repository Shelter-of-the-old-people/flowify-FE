// ─── 노드 타입 분류 ──────────────────────────────────────────
/** 도메인 서비스 노드 */
type DomainNodeType =
  | "communication" // Gmail, Slack
  | "storage" // Google Drive, Notion
  | "spreadsheet" // Google Sheets
  | "web-scraping" // 쿠팡, 원티드, 네이버 뉴스 등
  | "calendar"; // Google Calendar

/** 프로세싱 & 로직 노드 */
type ProcessingNodeType =
  | "trigger" // 시간/이벤트 트리거
  | "filter" // 필터링 및 중복 제거
  | "loop" // 반복
  | "condition" // 조건 분기
  | "multi-output" // 다중 출력
  | "data-process" // 변환/집계/정렬/분류
  | "output-format" // 출력 포맷 지정
  | "early-exit" // 조기 종료
  | "notification"; // 알림

/** AI 노드 */
type AINodeType = "llm";

export type NodeType = DomainNodeType | ProcessingNodeType | AINodeType;

export type NodeCategory = "domain" | "processing" | "ai";

// ─── Config 기반 인터페이스 ──────────────────────────────────
interface BaseNodeConfig {
  /** 설정 완료 여부 — 캔버스에서 경고 표시 기준 */
  isConfigured: boolean;
  /** 중간 노드 위자드에서 선택한 액션 ID */
  choiceActionId?: string | null;
  /** 중간 노드 위자드 후속 설정 값 */
  choiceSelections?: Record<string, string | string[]> | null;
}

// ─── 도메인 서비스 노드 Config ───────────────────────────────
export interface CommunicationNodeConfig extends BaseNodeConfig {
  service: "gmail" | "slack" | null;
  account: string | null;
  channel: string | null;
  action: "send" | "receive" | null;
  labelFilter: string | null;
  messageFormat: string | null;
}

export interface StorageNodeConfig extends BaseNodeConfig {
  service: "google-drive" | "notion" | null;
  targetPath: string | null;
  action: "read" | "write" | "update" | null;
  permissions: string | null;
}

export interface SpreadsheetNodeConfig extends BaseNodeConfig {
  service: "google-sheets" | null;
  spreadsheetId: string | null;
  sheetName: string | null;
  action: "read" | "write" | "append" | "update" | null;
  range: string | null;
}

export interface WebScrapingNodeConfig extends BaseNodeConfig {
  targetUrl: string | null;
  selector: string | null;
  outputFields: string[];
  pagination: boolean;
}

export interface CalendarNodeConfig extends BaseNodeConfig {
  service: "google-calendar" | null;
  account: string | null;
  action: "read" | "create" | "update" | "delete" | null;
  calendarId: string | null;
  dateRange: string | null;
}

// ─── 프로세싱 & 로직 노드 Config ────────────────────────────
export interface TriggerNodeConfig extends BaseNodeConfig {
  triggerType: "time" | "event" | null;
  schedule: string | null; // cron 표현식
  eventService: string | null;
  eventType: string | null;
}

export interface FilterNodeConfig extends BaseNodeConfig {
  field: string | null;
  operator:
    | "eq"
    | "neq"
    | "gt"
    | "lt"
    | "contains"
    | "not-contains"
    | "is-empty"
    | "is-not-empty"
    | null;
  value: string | null;
  removeDuplicates: boolean;
}

export interface LoopNodeConfig extends BaseNodeConfig {
  targetField: string | null;
  maxIterations: number; // 기본값 100
  timeout: number; // 초 단위, 기본값 300
}

export interface ConditionNodeConfig extends BaseNodeConfig {
  field: string | null;
  operator: "eq" | "neq" | "gt" | "lt" | "contains" | null;
  value: string | null;
}

export interface MultiOutputNodeConfig extends BaseNodeConfig {
  outputCount: number;
  conditions: Array<{
    label: string;
    field: string;
    operator: string;
    value: string;
  }>;
}

export interface DataProcessNodeConfig extends BaseNodeConfig {
  operation: "transform" | "aggregate" | "sort" | "classify" | null;
  field: string | null;
  sortDirection: "asc" | "desc" | null;
  aggregateFunction: "sum" | "avg" | "count" | "max" | "min" | null;
}

export interface OutputFormatNodeConfig extends BaseNodeConfig {
  format: "text" | "json" | "csv" | "html" | "markdown" | null;
  template: string | null;
}

export interface EarlyExitNodeConfig extends BaseNodeConfig {
  condition: string | null;
  exitMessage: string | null;
}

export interface NotificationNodeConfig extends BaseNodeConfig {
  channel: "email" | "slack" | "webhook" | null;
  recipient: string | null;
  messageTemplate: string | null;
}

// ─── AI 노드 Config ──────────────────────────────────────────
export interface LLMNodeConfig extends BaseNodeConfig {
  prompt: string;
  model: string | null;
  outputFormat: "text" | "json" | "table";
  temperature: number; // 기본값 0.7
}

// ─── NodeConfig 유니온 ───────────────────────────────────────
export type NodeConfig =
  | CommunicationNodeConfig
  | StorageNodeConfig
  | SpreadsheetNodeConfig
  | WebScrapingNodeConfig
  | CalendarNodeConfig
  | TriggerNodeConfig
  | FilterNodeConfig
  | LoopNodeConfig
  | ConditionNodeConfig
  | MultiOutputNodeConfig
  | DataProcessNodeConfig
  | OutputFormatNodeConfig
  | EarlyExitNodeConfig
  | NotificationNodeConfig
  | LLMNodeConfig;

export type NodeConfigMap = {
  communication: CommunicationNodeConfig;
  storage: StorageNodeConfig;
  spreadsheet: SpreadsheetNodeConfig;
  "web-scraping": WebScrapingNodeConfig;
  calendar: CalendarNodeConfig;
  trigger: TriggerNodeConfig;
  filter: FilterNodeConfig;
  loop: LoopNodeConfig;
  condition: ConditionNodeConfig;
  "multi-output": MultiOutputNodeConfig;
  "data-process": DataProcessNodeConfig;
  "output-format": OutputFormatNodeConfig;
  "early-exit": EarlyExitNodeConfig;
  notification: NotificationNodeConfig;
  llm: LLMNodeConfig;
};

export const getTypedConfig = <T extends NodeType>(
  _type: T,
  config: NodeConfig,
): NodeConfigMap[T] => {
  return config as NodeConfigMap[T];
};

// ─── React Flow Node data 필드 타입 ─────────────────────────
export interface FlowNodeData extends Record<string, unknown> {
  type: NodeType;
  label: string;
  config: NodeConfig;
  /** 이 노드가 받아들이는 데이터 타입 목록 (빈 배열 = 시작 노드) */
  inputTypes: import("./dataType").DataType[];
  /** 이 노드가 내보내는 데이터 타입 목록 */
  outputTypes: import("./dataType").DataType[];
  authWarning?: boolean;
}
