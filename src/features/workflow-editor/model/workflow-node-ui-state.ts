import { type Node } from "@xyflow/react";

import { type FlowNodeData } from "@/entities/node";

type WorkflowNode = Node<FlowNodeData> | null | undefined;

const readServiceKey = (node: WorkflowNode) => {
  const service = node?.data.config.service;
  return typeof service === "string" && service.trim().length > 0
    ? service
    : null;
};

export const hasSelectedSinkService = (node: WorkflowNode) =>
  readServiceKey(node) !== null;

export const isMiddleWorkflowNode = (
  node: WorkflowNode,
  startNodeId: string | null,
  endNodeId: string | null,
) => Boolean(node && node.id !== startNodeId && node.id !== endNodeId);

export const isMiddleWizardCompleted = (node: WorkflowNode) =>
  node?.data.config.isConfigured === true;

export const isMiddleWizardPending = (
  node: WorkflowNode,
  startNodeId: string | null,
  endNodeId: string | null,
) =>
  isMiddleWorkflowNode(node, startNodeId, endNodeId) &&
  !isMiddleWizardCompleted(node);

export const canStartProcessingAfterSinkSelection = ({
  creationMethod,
  endNode,
  startNodeId,
}: {
  creationMethod: string | null;
  endNode: WorkflowNode;
  startNodeId: string | null;
}) =>
  startNodeId !== null &&
  endNode !== null &&
  hasSelectedSinkService(endNode) &&
  !creationMethod;
