import { type Edge } from "@xyflow/react";

import { type FlowNodeData } from "@/entities/node";
import {
  FILE_TYPE_BRANCH_TARGET_HANDLE,
  type FileTypeBranchKey,
  getFileTypeBranchLabel,
  toFileTypeBranchKeys,
} from "@/features/choice-panel";

const DEFAULT_FLOW_NODE_WIDTH = 172;
const NODE_GAP_X = 96;
const BRANCH_TARGET_GAP_Y = 220;

type FlowNode = {
  id: string;
  position: { x: number; y: number };
  data: {
    config: FlowNodeData["config"];
  };
};

export type FileTypeBranchTargetDraft = {
  branchKey: FileTypeBranchKey;
  label: string;
  position: { x: number; y: number };
  prevEdgeLabel: FileTypeBranchKey;
  prevEdgeSourceHandle: FileTypeBranchKey;
  prevEdgeTargetHandle: typeof FILE_TYPE_BRANCH_TARGET_HANDLE;
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

  return branchKeys.flatMap((branchKey, index) => {
    if (existingBranchKeys.has(branchKey)) {
      return [];
    }

    return {
      branchKey,
      label: `${getFileTypeBranchLabel(branchKey)} 처리`,
      position: toBranchTargetPosition({
        branchNode,
        index,
        total: branchKeys.length,
      }),
      prevEdgeLabel: branchKey,
      prevEdgeSourceHandle: branchKey,
      prevEdgeTargetHandle: FILE_TYPE_BRANCH_TARGET_HANDLE,
    };
  });
};
