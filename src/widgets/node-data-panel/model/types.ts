import { type Node } from "@xyflow/react";

import {
  type ExecutionNodeData,
  type NodeSchemaPreviewResponse,
  type SchemaPreviewResponse,
} from "@/entities";
import { type FlowNodeData } from "@/entities/node";

export type NodeDataPanelKind = "input" | "output";

export type NodeDataPanelState =
  | "no-node"
  | "permission-denied"
  | "loading"
  | "error"
  | "no-execution"
  | "execution-running"
  | "node-skipped"
  | "node-failed"
  | "node-not-executed"
  | "data-empty"
  | "data-ready";

export type NodeDataPanelModel = {
  activeNode: Node<FlowNodeData> | null;
  sourceNode: Node<FlowNodeData> | null;
  isStartNode: boolean;
  isEndNode: boolean;
  staticInputLabel: string | null;
  staticOutputLabel: string | null;
  executionData: ExecutionNodeData | null;
  schemaPreview: NodeSchemaPreviewResponse | null;
  state: NodeDataPanelState;
  dataToDisplay: unknown;
  schemaToDisplay: SchemaPreviewResponse | null;
  schemaPreviewLabel: string | null;
  canViewExecutionData: boolean;
  isExecutionDataLoading: boolean;
  isSchemaPreviewLoading: boolean;
  isStaleAgainstCurrentEditor: boolean;
};
