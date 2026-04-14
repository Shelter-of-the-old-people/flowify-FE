import type { Edge, Node } from "@xyflow/react";

import { NODE_REGISTRY } from "@/entities/node";
import type {
  DataType,
  FlowNodeData,
  NodeConfig,
  NodeType,
} from "@/entities/node";

import type {
  EdgeDefinitionResponse,
  NodeAddRequest,
  NodeDefinitionResponse,
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

export const toBackendNodeType = (type: NodeType) => NODE_TYPE_TO_BACKEND[type];

export const toFrontendNodeType = (type: string | null | undefined): NodeType =>
  getFallbackNodeType(
    type ? (BACKEND_TYPE_TO_NODE_TYPE[type] ?? type) : "data-process",
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
  const backendType = toBackendNodeType(type);
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

  return {
    id: node.id,
    category: NODE_TYPE_TO_BACKEND[node.data.type].category,
    type: NODE_TYPE_TO_BACKEND[node.data.type].type,
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
  const nodeType = getFallbackNodeType(
    BACKEND_TYPE_TO_NODE_TYPE[node.type] ?? node.type,
  );
  const meta = NODE_REGISTRY[nodeType];

  return {
    id: node.id,
    type: nodeType,
    position: node.position,
    data: {
      type: nodeType,
      label: node.label ?? meta.label,
      config: {
        ...meta.defaultConfig,
        ...(node.config as Record<string, unknown>),
      } as NodeConfig,
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
