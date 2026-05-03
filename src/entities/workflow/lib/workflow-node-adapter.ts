import { type Edge, type Node } from "@xyflow/react";

import { NODE_REGISTRY } from "@/entities/node";
import {
  type DataType,
  type FlowNodeData,
  type NodeConfig,
  type NodeType,
} from "@/entities/node";

import {
  type EdgeDefinitionResponse,
  type NodeAddRequest,
  type NodeDefinitionResponse,
} from "../api";

const DATA_TYPE_MAP = {
  FILE_LIST: "file-list",
  SINGLE_FILE: "single-file",
  TEXT: "text",
  SPREADSHEET_DATA: "spreadsheet",
  EMAIL_LIST: "email-list",
  SINGLE_EMAIL: "single-email",
  API_RESPONSE: "api-response",
  SCHEDULE_DATA: "schedule-data",
} as const satisfies Record<string, DataType>;

const NODE_TYPE_TO_BACKEND: Record<
  NodeType,
  { category: string; type: string }
> = {
  communication: { category: "service", type: "communication" },
  storage: { category: "service", type: "storage" },
  spreadsheet: { category: "service", type: "spreadsheet" },
  "web-scraping": { category: "service", type: "web-scraping" },
  calendar: { category: "service", type: "calendar" },
  notification: { category: "service", type: "notification" },
  trigger: { category: "control", type: "trigger" },
  filter: { category: "control", type: "filter" },
  loop: { category: "control", type: "loop" },
  condition: { category: "control", type: "condition" },
  "multi-output": { category: "control", type: "multi-output" },
  "early-exit": { category: "control", type: "early-exit" },
  "data-process": { category: "processing", type: "data-process" },
  "output-format": { category: "processing", type: "output-format" },
  llm: { category: "ai", type: "llm" },
};

const BACKEND_TYPE_TO_NODE_TYPE = Object.fromEntries(
  Object.entries(NODE_TYPE_TO_BACKEND).map(([nodeType, { type }]) => [
    type,
    nodeType as NodeType,
  ]),
) as Record<string, NodeType>;

const SERVICE_KEY_TO_NODE_TYPE = {
  canvas_lms: "storage",
  coupang: "web-scraping",
  github: "web-scraping",
  gmail: "communication",
  google_calendar: "calendar",
  google_drive: "storage",
  google_sheets: "spreadsheet",
  naver_news: "web-scraping",
  notion: "storage",
  slack: "communication",
  youtube: "web-scraping",
} as const satisfies Record<string, NodeType>;

const NODE_TYPES_WITH_SERVICE_CONFIG = new Set<NodeType>([
  "calendar",
  "communication",
  "spreadsheet",
  "storage",
  "web-scraping",
]);

type NodeDraftOptions = {
  authWarning?: boolean;
  config?: Partial<NodeConfig>;
  inputTypes?: DataType[];
  outputTypes?: DataType[];
  position: { x: number; y: number };
  prevNodeId?: string;
  role?: NodeDefinitionResponse["role"];
  type: NodeType;
};

const isNodeType = (value: string): value is NodeType => value in NODE_REGISTRY;

const getFallbackNodeType = (value: string): NodeType => {
  if (isNodeType(value)) {
    return value;
  }

  return "llm";
};

const getServiceKeyFromConfig = (
  config: Partial<NodeConfig> | Record<string, unknown> | undefined,
) => {
  const service = config && "service" in config ? config.service : null;
  return typeof service === "string" ? service : null;
};

const getPersistedBackendType = ({
  config,
  role,
  type,
}: {
  config: Partial<NodeConfig> | Record<string, unknown> | undefined;
  role: NodeDefinitionResponse["role"] | undefined;
  type: NodeType;
}) => {
  const backendType = toBackendNodeType(type);

  if (role === "start" || role === "end") {
    const serviceKey = getServiceKeyFromConfig(config);
    if (serviceKey) {
      return {
        category: backendType.category,
        type: serviceKey,
      };
    }
  }

  return backendType;
};

export const toBackendNodeType = (type: NodeType) => NODE_TYPE_TO_BACKEND[type];

export const getVisualNodeTypeFromServiceKey = (
  serviceKey: string | null | undefined,
): NodeType | null => {
  if (!serviceKey) {
    return null;
  }

  return (
    SERVICE_KEY_TO_NODE_TYPE[
      serviceKey as keyof typeof SERVICE_KEY_TO_NODE_TYPE
    ] ?? null
  );
};

export const toFrontendNodeType = (type: string | null | undefined): NodeType =>
  getFallbackNodeType(
    type
      ? (BACKEND_TYPE_TO_NODE_TYPE[type] ??
          getVisualNodeTypeFromServiceKey(type) ??
          type)
      : "data-process",
  );

export const toFrontendDataType = (backend: string): DataType =>
  DATA_TYPE_MAP[backend as keyof typeof DATA_TYPE_MAP] ??
  (backend.toLowerCase().replace(/_/g, "-") as DataType);

export const toBackendDataType = (frontend: DataType): string =>
  Object.entries(DATA_TYPE_MAP).find(([, value]) => value === frontend)?.[0] ??
  frontend.toUpperCase().replace(/-/g, "_");

export const toNodeAddRequest = ({
  type,
  position,
  config,
  inputTypes,
  outputTypes,
  role,
  prevNodeId,
  authWarning = false,
}: NodeDraftOptions): NodeAddRequest => {
  const meta = NODE_REGISTRY[type];
  const backendType = getPersistedBackendType({ config, role, type });
  const mergedInputTypes = inputTypes ?? [...meta.defaultInputTypes];
  const mergedOutputTypes = outputTypes ?? [...meta.defaultOutputTypes];

  return {
    category: backendType.category,
    type: backendType.type,
    position,
    config: {
      ...meta.defaultConfig,
      ...config,
    } as Record<string, unknown>,
    dataType: mergedInputTypes[0]
      ? toBackendDataType(mergedInputTypes[0])
      : null,
    outputDataType: mergedOutputTypes[0]
      ? toBackendDataType(mergedOutputTypes[0])
      : null,
    role,
    prevNodeId,
    authWarning,
  };
};

export const toEdgeDefinition = (edge: Edge): EdgeDefinitionResponse => ({
  source: edge.source,
  target: edge.target,
});

export const toFlowEdge = (edge: EdgeDefinitionResponse): Edge => ({
  id: edge.id ?? crypto.randomUUID(),
  source: edge.source,
  target: edge.target,
  sourceHandle: edge.sourceHandle ?? null,
  targetHandle: edge.targetHandle ?? null,
  data: {
    variant: "flow-arrow",
  },
});

export const toNodeDefinition = (
  node: Node<FlowNodeData>,
  startNodeId: string | null,
  endNodeId: string | null,
): NodeDefinitionResponse => {
  const role =
    node.id === startNodeId
      ? "start"
      : node.id === endNodeId
        ? "end"
        : "middle";
  const backendType = getPersistedBackendType({
    config: node.data.config as Partial<NodeConfig>,
    role,
    type: node.data.type,
  });

  return {
    id: node.id,
    category: backendType.category,
    type: backendType.type,
    role,
    position: {
      x: node.position.x,
      y: node.position.y,
    },
    config: node.data.config as unknown as Record<string, unknown>,
    dataType: node.data.inputTypes[0]
      ? toBackendDataType(node.data.inputTypes[0])
      : null,
    outputDataType: node.data.outputTypes[0]
      ? toBackendDataType(node.data.outputTypes[0])
      : null,
    authWarning: node.data.authWarning ?? false,
  };
};

export const toFlowNode = (
  node: NodeDefinitionResponse,
): Node<FlowNodeData> => {
  const nodeType = toFrontendNodeType(node.type);
  const meta = NODE_REGISTRY[nodeType];
  const config = {
    ...meta.defaultConfig,
    ...(node.config as Record<string, unknown>),
  } as NodeConfig;

  if (
    (node.role === "start" || node.role === "end") &&
    NODE_TYPES_WITH_SERVICE_CONFIG.has(nodeType) &&
    getServiceKeyFromConfig(config as unknown as Record<string, unknown>) ===
      null
  ) {
    (config as unknown as Record<string, unknown>).service = node.type;
  }

  return {
    id: node.id,
    type: nodeType,
    position: node.position,
    data: {
      type: nodeType,
      label: node.label ?? meta.label,
      config,
      inputTypes: node.dataType
        ? [toFrontendDataType(node.dataType)]
        : [...meta.defaultInputTypes],
      outputTypes: node.outputDataType
        ? [toFrontendDataType(node.outputDataType)]
        : [...meta.defaultOutputTypes],
      authWarning: node.authWarning,
    },
  };
};

export const findAddedNodeId = (
  previousNodes: Array<{ id: string }>,
  nextNodes: Array<{ id: string }>,
) => {
  const existingIds = new Set(previousNodes.map((node) => node.id));
  return nextNodes.find((node) => !existingIds.has(node.id))?.id ?? null;
};
