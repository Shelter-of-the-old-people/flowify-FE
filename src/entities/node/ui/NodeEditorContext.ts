import { createContext, useContext } from "react";

import { type NodeVisualIssue } from "../model";

export type NodeLifecycleStatus = {
  configured: boolean;
  executable: boolean;
  missingFields: string[];
};

export type NodeEditorContextValue = {
  canEditNodes: boolean;
  endNodeIds: string[];
  getNodeStatus: (nodeId: string) => NodeLifecycleStatus | null;
  getNodeVisualIssue: (nodeId: string) => NodeVisualIssue | null;
  onOpenPanel: (nodeId: string) => void;
  onRemoveNode: (nodeId: string) => void;
  startNodeId: string | null;
};

export const DEFAULT_NODE_EDITOR_CONTEXT: NodeEditorContextValue = {
  canEditNodes: true,
  startNodeId: null,
  endNodeIds: [],
  getNodeStatus: () => null,
  getNodeVisualIssue: () => null,
  onOpenPanel: () => {},
  onRemoveNode: () => {},
};

export const NodeEditorContext = createContext<NodeEditorContextValue>(
  DEFAULT_NODE_EDITOR_CONTEXT,
);

export const useNodeEditorContext = () => useContext(NodeEditorContext);
