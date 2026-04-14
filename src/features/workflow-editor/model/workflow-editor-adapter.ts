import { type Edge, type Node } from "@xyflow/react";

import { type FlowNodeData } from "@/entities/node";
import {
  type UpdateWorkflowRequest,
  type WorkflowResponse,
  toEdgeDefinition,
  toFlowEdge,
  toFlowNode,
  toNodeDefinition,
} from "@/entities/workflow";

export interface WorkflowEditorStoreState {
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
  creationMethod: "manual" | null;
}

export const toWorkflowUpdateRequest = (
  store: WorkflowEditorStoreState,
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
    creationMethod: startNode ? "manual" : null,
  };
};
