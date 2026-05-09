import { createContext, useContext } from "react";

export type NodeLifecycleStatus = {
  configured: boolean;
  executable: boolean;
  missingFields: string[];
};

export type NodeEditorContextValue = {
  canEditNodes: boolean;
  endNodeIds: string[];
  getBranchHeadInfo: (
    nodeId: string,
  ) => { branchKey: string; branchLabel: string; parentNodeId: string } | null;
  getNodeStatus: (nodeId: string) => NodeLifecycleStatus | null;
  onOpenPanel: (nodeId: string) => void;
  onRemoveNode: (nodeId: string) => void;
  startNodeId: string | null;
};

export const DEFAULT_NODE_EDITOR_CONTEXT: NodeEditorContextValue = {
  canEditNodes: true,
  startNodeId: null,
  endNodeIds: [],
  getBranchHeadInfo: () => null,
  getNodeStatus: () => null,
  onOpenPanel: () => {},
  onRemoveNode: () => {},
};

export const NodeEditorContext = createContext<NodeEditorContextValue>(
  DEFAULT_NODE_EDITOR_CONTEXT,
);

export const useNodeEditorContext = () => useContext(NodeEditorContext);
