import { type Edge, type Node } from "@xyflow/react";

import { type FlowNodeData } from "@/entities/node";
import {
  type TriggerConfig,
  type UpdateWorkflowRequest,
  type WorkflowNodeStatusResponse,
  type WorkflowResponse,
  normalizeWorkflowActive,
  normalizeWorkflowTrigger,
  toEdgeDefinition,
  toFlowEdge,
  toFlowNode,
  toNodeDefinition,
} from "@/entities/workflow";

export interface WorkflowEditorSaveState {
  workflowName: string;
  workflowTrigger: TriggerConfig;
  workflowActive: boolean;
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  startNodeId: string | null;
  endNodeIds: string[];
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
  workflowTrigger: TriggerConfig;
  workflowActive: boolean;
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  nodeStatuses: WorkflowNodeStatusMap;
  startNodeId: string | null;
  endNodeIds: string[];
  endNodeId: string | null;
}

export const toNodeStatusMap = (
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
  trigger: normalizeWorkflowTrigger(store.workflowTrigger),
  active: normalizeWorkflowActive(store.workflowTrigger, store.workflowActive),
  nodes: store.nodes.map((node) =>
    toNodeDefinition(node, store.startNodeId, store.endNodeIds),
  ),
  edges: store.edges.map(toEdgeDefinition),
});

export const hydrateStore = (
  workflow: WorkflowResponse,
): WorkflowHydratedState => {
  const startNode = workflow.nodes.find((node) => node.role === "start");
  const endNodeIds = workflow.nodes
    .filter((node) => node.role === "end")
    .map((node) => node.id);

  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    workflowTrigger: normalizeWorkflowTrigger(workflow.trigger),
    workflowActive: normalizeWorkflowActive(workflow.trigger, workflow.active),
    nodes: workflow.nodes.map(toFlowNode),
    edges: workflow.edges.map(toFlowEdge),
    nodeStatuses: toNodeStatusMap(workflow.nodeStatuses),
    startNodeId: startNode?.id ?? null,
    endNodeIds,
    endNodeId: endNodeIds[0] ?? null,
  };
};
