import { type Node } from "@xyflow/react";

import { type FlowNodeData, type WorkflowNodeRole } from "./types";

type WorkflowNodeLike =
  | Pick<Node<FlowNodeData>, "id" | "data">
  | null
  | undefined;

const isWorkflowNodeRole = (value: unknown): value is WorkflowNodeRole =>
  value === "start" || value === "middle" || value === "end";

export const resolveWorkflowNodeRole = ({
  endNodeIds,
  nodeId,
  startNodeId,
  workflowRole,
}: {
  nodeId: string;
  startNodeId: string | null;
  endNodeIds: string[];
  workflowRole?: unknown;
}): WorkflowNodeRole => {
  if (isWorkflowNodeRole(workflowRole)) {
    return workflowRole;
  }

  if (nodeId === startNodeId) {
    return "start";
  }

  if (endNodeIds.includes(nodeId)) {
    return "end";
  }

  return "middle";
};

export const getWorkflowNodeRole = (
  node: WorkflowNodeLike,
  startNodeId: string | null,
  endNodeIds: string[],
): WorkflowNodeRole | null => {
  if (!node) {
    return null;
  }

  return resolveWorkflowNodeRole({
    nodeId: node.id,
    startNodeId,
    endNodeIds,
    workflowRole: node.data.workflowRole,
  });
};

export const isEndWorkflowNodeId = (
  nodeId: string | null | undefined,
  endNodeIds: string[],
) => Boolean(nodeId && endNodeIds.includes(nodeId));

export const isEndWorkflowNode = (
  node: WorkflowNodeLike,
  startNodeId: string | null,
  endNodeIds: string[],
) => getWorkflowNodeRole(node, startNodeId, endNodeIds) === "end";

export const isMiddleWorkflowNode = (
  node: WorkflowNodeLike,
  startNodeId: string | null,
  endNodeIds: string[],
) => getWorkflowNodeRole(node, startNodeId, endNodeIds) === "middle";
