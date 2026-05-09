import { type Edge, type Node } from "@xyflow/react";

import { type FlowNodeData } from "@/entities/node";
import { collectDescendantIds } from "@/shared";

import {
  FILE_TYPE_BRANCH_TARGET_HANDLE,
  type FileTypeBranchKey,
  getFileTypeBranchLabel,
  isFileTypeBranchAction,
  toFileTypeBranchKeys,
} from "./fileTypeBranch";

const DEFAULT_FLOW_NODE_WIDTH = 172;
const NODE_GAP_X = 96;
const BRANCH_TARGET_GAP_Y = 220;

type FlowNode = Pick<Node<FlowNodeData>, "id" | "position" | "data">;

export type FileTypeBranchTargetDraft = {
  branchKey: FileTypeBranchKey;
  label: string;
  position: { x: number; y: number };
  prevEdgeLabel: FileTypeBranchKey;
  prevEdgeSourceHandle: FileTypeBranchKey;
  prevEdgeTargetHandle: typeof FILE_TYPE_BRANCH_TARGET_HANDLE;
};

export type FileTypeBranchHeadInfo = {
  branchKey: FileTypeBranchKey;
  branchLabel: string;
  parentNodeId: string;
  targetNodeId: string;
};

export type FileTypeBranchPathState = {
  branchKey: FileTypeBranchKey;
  branchLabel: string;
  hasPath: boolean;
  isConfigured: boolean;
  targetNodeId: string | null;
  targetLabel: string | null;
};

const toBranchKey = (value: unknown): FileTypeBranchKey | null => {
  if (typeof value !== "string") {
    return null;
  }

  return toFileTypeBranchKeys({ branch_config: value })[0] ?? null;
};

const isFileTypeBranchNode = (node: FlowNode | null | undefined) =>
  Boolean(node && isFileTypeBranchAction(node.data.config.choiceActionId));

export const getFileTypeBranchKeyFromEdge = (
  edge: Edge,
): FileTypeBranchKey | null => {
  const data = (edge.data ?? null) as {
    branchKey?: unknown;
    label?: unknown;
  } | null;

  return (
    toBranchKey(data?.branchKey) ??
    toBranchKey(edge.sourceHandle) ??
    toBranchKey(data?.label)
  );
};

export const getFileTypeBranchKeysFromNode = (
  node: FlowNode | null | undefined,
): FileTypeBranchKey[] => {
  if (!node) {
    return [];
  }

  const branchTypes = Array.isArray(node.data.config.branchTypes)
    ? node.data.config.branchTypes
    : null;

  if (branchTypes) {
    return toFileTypeBranchKeys({ branch_config: branchTypes });
  }

  return toFileTypeBranchKeys(node.data.config.choiceSelections ?? null);
};

const toBranchTargetPosition = ({
  branchNode,
  index,
  total,
}: {
  branchNode: FlowNode;
  index: number;
  total: number;
}) => ({
  x: branchNode.position.x + DEFAULT_FLOW_NODE_WIDTH + NODE_GAP_X,
  y: branchNode.position.y + (index - (total - 1) / 2) * BRANCH_TARGET_GAP_Y,
});

export const createFileTypeBranchTargetDraft = ({
  branchKey,
  branchKeys,
  branchNode,
}: {
  branchKey: FileTypeBranchKey;
  branchKeys: FileTypeBranchKey[];
  branchNode: FlowNode;
}): FileTypeBranchTargetDraft | null => {
  const branchIndex = branchKeys.indexOf(branchKey);
  if (branchIndex < 0) {
    return null;
  }

  return {
    branchKey,
    label: `${getFileTypeBranchLabel(branchKey)} 처리`,
    position: toBranchTargetPosition({
      branchNode,
      index: branchIndex,
      total: branchKeys.length,
    }),
    prevEdgeLabel: branchKey,
    prevEdgeSourceHandle: branchKey,
    prevEdgeTargetHandle: FILE_TYPE_BRANCH_TARGET_HANDLE,
  };
};

export const createFileTypeBranchTargetDrafts = ({
  branchKeys,
  branchNode,
  edges,
}: {
  branchKeys: FileTypeBranchKey[];
  branchNode: FlowNode;
  edges: Edge[];
}): FileTypeBranchTargetDraft[] => {
  const existingBranchKeys = new Set(
    edges
      .filter((edge) => edge.source === branchNode.id)
      .map((edge) => getFileTypeBranchKeyFromEdge(edge))
      .filter((branchKey): branchKey is FileTypeBranchKey =>
        Boolean(branchKey),
      ),
  );

  return branchKeys.flatMap((branchKey) => {
    if (existingBranchKeys.has(branchKey)) {
      return [];
    }

    const draft = createFileTypeBranchTargetDraft({
      branchKey,
      branchKeys,
      branchNode,
    });

    return draft ? [draft] : [];
  });
};

export const getFileTypeBranchHeadInfo = ({
  edges,
  nodeId,
  nodes,
}: {
  nodeId: string;
  nodes: Array<Node<FlowNodeData>>;
  edges: Edge[];
}): FileTypeBranchHeadInfo | null => {
  const incomingEdge = edges.find((edge) => edge.target === nodeId);
  if (!incomingEdge) {
    return null;
  }

  const branchKey = getFileTypeBranchKeyFromEdge(incomingEdge);
  if (!branchKey) {
    return null;
  }

  const parentNode =
    nodes.find((node) => node.id === incomingEdge.source) ?? null;
  if (!isFileTypeBranchNode(parentNode)) {
    return null;
  }

  return {
    branchKey,
    branchLabel: getFileTypeBranchLabel(branchKey),
    parentNodeId: parentNode!.id,
    targetNodeId: nodeId,
  };
};

export const getFileTypeBranchPathStates = ({
  branchNode,
  edges,
  nodes,
}: {
  branchNode: Node<FlowNodeData>;
  nodes: Array<Node<FlowNodeData>>;
  edges: Edge[];
}): FileTypeBranchPathState[] => {
  const branchKeys = getFileTypeBranchKeysFromNode(branchNode);
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  return branchKeys.map((branchKey) => {
    const branchEdge =
      edges.find(
        (edge) =>
          edge.source === branchNode.id &&
          getFileTypeBranchKeyFromEdge(edge) === branchKey,
      ) ?? null;
    const targetNode = branchEdge
      ? (nodeMap.get(branchEdge.target) ?? null)
      : null;

    return {
      branchKey,
      branchLabel: getFileTypeBranchLabel(branchKey),
      hasPath: targetNode !== null,
      isConfigured: targetNode?.data.config.isConfigured === true,
      targetNodeId: targetNode?.id ?? null,
      targetLabel: targetNode?.data.label?.trim() || null,
    };
  });
};

export const getFileTypeBranchRemovalOrder = ({
  edges,
  rootNodeId,
}: {
  rootNodeId: string;
  edges: Edge[];
}): string[] => {
  const branchNodeIds = [
    rootNodeId,
    ...collectDescendantIds(rootNodeId, edges),
  ];
  const branchNodeIdSet = new Set(branchNodeIds);
  const removalOrder: string[] = [];
  const remainingNodeIds = new Set(branchNodeIds);

  while (remainingNodeIds.size > 0) {
    const removableNodeId = [...remainingNodeIds].find(
      (nodeId) =>
        !edges.some(
          (edge) =>
            edge.source === nodeId &&
            branchNodeIdSet.has(edge.target) &&
            remainingNodeIds.has(edge.target),
        ),
    );

    if (!removableNodeId) {
      break;
    }

    removalOrder.push(removableNodeId);
    remainingNodeIds.delete(removableNodeId);
  }

  if (remainingNodeIds.size > 0) {
    removalOrder.push(...remainingNodeIds);
  }

  return removalOrder;
};
