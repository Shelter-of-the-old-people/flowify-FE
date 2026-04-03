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
  NodeDefinitionResponse,
  UpdateWorkflowRequest,
  WorkflowResponse,
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

export interface WorkflowAdapterStoreState {
  workflowName: string;
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  startNodeId: string | null;
  endNodeId: string | null;
}

export interface WorkflowHydratedState {
  workflowId: string;
  workflowName: string;
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  startNodeId: string | null;
  endNodeId: string | null;
}

const isNodeType = (value: string): value is NodeType => value in NODE_REGISTRY;

const getFallbackNodeType = (value: string): NodeType => {
  if (isNodeType(value)) {
    return value;
  }

  return "llm";
};

export const toFrontendDataType = (backend: string): DataType =>
  DATA_TYPE_MAP[backend as keyof typeof DATA_TYPE_MAP] ??
  (backend.toLowerCase().replace(/_/g, "-") as DataType);

export const toBackendDataType = (frontend: DataType): string =>
  Object.entries(DATA_TYPE_MAP).find(([, value]) => value === frontend)?.[0] ??
  frontend.toUpperCase().replace(/-/g, "_");

export const toEdgeDefinition = (edge: Edge): EdgeDefinitionResponse => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  sourceHandle: edge.sourceHandle ?? null,
  targetHandle: edge.targetHandle ?? null,
});

export const toFlowEdge = (edge: EdgeDefinitionResponse): Edge => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  sourceHandle: edge.sourceHandle ?? null,
  targetHandle: edge.targetHandle ?? null,
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
    type: node.data.type,
    label: node.data.label,
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
  const nodeType = getFallbackNodeType(node.type);
  const meta = NODE_REGISTRY[nodeType];

  return {
    id: node.id,
    type: nodeType,
    position: node.position,
    data: {
      type: nodeType,
      label: node.label,
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

export const toWorkflowUpdateRequest = (
  store: WorkflowAdapterStoreState,
): UpdateWorkflowRequest => ({
  name: store.workflowName,
  nodes: store.nodes.map((node) =>
    toNodeDefinition(node, store.startNodeId, store.endNodeId),
  ),
  edges: store.edges.map(toEdgeDefinition),
});

export const hydrateStore = (
  workflow: WorkflowResponse,
): WorkflowHydratedState => {
  const startNode = workflow.nodes.find((node) => node.role === "start");
  const endNode = workflow.nodes.find((node) => node.role === "end");

  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    nodes: workflow.nodes.map(toFlowNode),
    edges: workflow.edges.map(toFlowEdge),
    startNodeId: startNode?.id ?? null,
    endNodeId: endNode?.id ?? null,
  };
};
