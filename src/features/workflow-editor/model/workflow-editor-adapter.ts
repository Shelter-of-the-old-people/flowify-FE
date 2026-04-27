import { type Edge, type Node } from "@xyflow/react";

import { type FlowNodeData } from "@/entities/node";
import {
  type UpdateWorkflowRequest,
  type WorkflowNodeStatusResponse,
  type WorkflowResponse,
  toEdgeDefinition,
  toFlowEdge,
  toFlowNode,
  toNodeDefinition,
} from "@/entities/workflow";

export interface WorkflowEditorSaveState {
  workflowName: string;
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  startNodeId: string | null;
  endNodeId: string | null;
}

export type WorkflowNodeStatus = Omit<
  WorkflowNodeStatusResponse,
  "missingFields"
> & {
  missingFields: string[];
};

export type WorkflowNodeStatusMap = Record<string, WorkflowNodeStatus>;

export interface WorkflowHydratedState {
  workflowId: string;
  workflowName: string;
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  nodeStatuses: WorkflowNodeStatusMap;
  startNodeId: string | null;
  endNodeId: string | null;
  creationMethod: "manual" | null;
}

const toNodeStatusMap = (
  nodeStatuses: WorkflowNodeStatusResponse[] | undefined,
): WorkflowNodeStatusMap =>
  Object.fromEntries(
    (nodeStatuses ?? []).map((nodeStatus) => [
      nodeStatus.nodeId,
      {
        ...nodeStatus,
        missingFields: nodeStatus.missingFields ?? [],
      },
    ]),
  );

export const toWorkflowUpdateRequest = (
  store: WorkflowEditorSaveState,
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
    nodeStatuses: toNodeStatusMap(workflow.nodeStatuses),
    startNodeId: startNode?.id ?? null,
    endNodeId: endNode?.id ?? null,
    creationMethod: startNode ? "manual" : null,
  };
};
