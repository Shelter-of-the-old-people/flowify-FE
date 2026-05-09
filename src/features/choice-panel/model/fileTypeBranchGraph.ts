import { type Edge, type Node } from "@xyflow/react";

import { type FlowNodeData } from "@/entities/node";

import {
  FILE_TYPE_BRANCH_TARGET_HANDLE,
  type FileTypeBranchKey,
  getFileTypeBranchLabel,
  toFileTypeBranchKeys,
} from "./fileTypeBranch";

const DEFAULT_FLOW_NODE_WIDTH = 172;
const NODE_GAP_X = 96;
const BRANCH_TARGET_GAP_Y = 220;

type FlowNode = Pick<Node<FlowNodeData>, "id" | "position" | "data">;

export type FileTypeBranchPathState = {
  branchKey: FileTypeBranchKey;
  branchLabel: string;
  hasPath: boolean;
  isConfigured: boolean;
  targetNodeId: string | null;
  targetLabel: string | null;
};

export type FileTypeBranchPlaceholderSpec = {
  branchKey: FileTypeBranchKey;
  branchLabel: string;
  id: string;
  position: { x: number; y: number };
  prevEdgeLabel: FileTypeBranchKey;
  prevEdgeSourceHandle: FileTypeBranchKey;
  prevEdgeTargetHandle: typeof FILE_TYPE_BRANCH_TARGET_HANDLE;
  sourceNodeId: string;
};

const toBranchKey = (value: unknown): FileTypeBranchKey | null => {
  if (typeof value !== "string") {
    return null;
  }

  return toFileTypeBranchKeys({ branch_config: value })[0] ?? null;
};

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

export const getFileTypeBranchPlaceholderSpecs = ({
  branchNode,
  edges,
}: {
  branchNode: Node<FlowNodeData>;
  edges: Edge[];
}): FileTypeBranchPlaceholderSpec[] => {
  const branchKeys = getFileTypeBranchKeysFromNode(branchNode);
  const existingBranchKeys = new Set(
    edges
      .filter((edge) => edge.source === branchNode.id)
      .map((edge) => getFileTypeBranchKeyFromEdge(edge))
      .filter((branchKey): branchKey is FileTypeBranchKey =>
        Boolean(branchKey),
      ),
  );

  return branchKeys.flatMap((branchKey, index) => {
    if (existingBranchKeys.has(branchKey)) {
      return [];
    }

    return [
      {
        branchKey,
        branchLabel: getFileTypeBranchLabel(branchKey),
        id: `placeholder-branch-next-${branchNode.id}-${branchKey}`,
        position: toBranchTargetPosition({
          branchNode,
          index,
          total: branchKeys.length,
        }),
        prevEdgeLabel: branchKey,
        prevEdgeSourceHandle: branchKey,
        prevEdgeTargetHandle: FILE_TYPE_BRANCH_TARGET_HANDLE,
        sourceNodeId: branchNode.id,
      },
    ];
  });
};
