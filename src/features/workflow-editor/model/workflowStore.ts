import { addEdge, applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import {
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { current } from "immer";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { type FlowNodeData } from "@/entities/node";

import { type WorkflowHydratedState } from "./workflow-editor-adapter";

type PlaceholderInfo = {
  id: string;
  position: { x: number; y: number };
};

type NodePosition = {
  x: number;
  y: number;
};

export interface WorkflowEditorCapabilities {
  canViewEditor: boolean;
  canEditNodes: boolean;
  canSaveWorkflow: boolean;
  canRunWorkflow: boolean;
}

interface WorkflowEditorState {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  activePanelNodeId: string | null;
  startNodeId: string | null;
  endNodeId: string | null;
  creationMethod: "manual" | null;
  activePlaceholder: PlaceholderInfo | null;
  workflowId: string;
  workflowName: string;
  editorCapabilities: WorkflowEditorCapabilities;
  unsavedNodePositions: Record<string, NodePosition>;
  isDirty: boolean;
  _isSyncing: boolean;
}

interface WorkflowEditorActions {
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  updateNodeConfig: (
    id: string,
    config: Partial<FlowNodeData["config"]>,
  ) => void;
  openPanel: (nodeId: string) => void;
  closePanel: () => void;
  setWorkflowMeta: (id: string, name: string) => void;
  hydrateWorkflow: (payload: WorkflowHydratedState) => void;
  syncWorkflowGraph: (
    payload: WorkflowHydratedState,
    options?: {
      preserveActivePanelNodeId?: boolean;
      preserveActivePlaceholder?: boolean;
      preserveDirty?: boolean;
    },
  ) => void;
  setWorkflowName: (name: string) => void;
  setEditorCapabilities: (capabilities: WorkflowEditorCapabilities) => void;
  setStartNodeId: (id: string | null) => void;
  setEndNodeId: (id: string | null) => void;
  setCreationMethod: (method: "manual" | null) => void;
  setActivePlaceholder: (placeholder: PlaceholderInfo | null) => void;
  applyLayoutPositions: (
    updates: Array<{ nodeId: string; position: NodePosition }>,
  ) => void;
  clearUnsavedNodePositions: (nodeIds?: string[]) => void;
  markClean: () => void;
  resetEditor: () => void;
}

const initialState: WorkflowEditorState = {
  nodes: [],
  edges: [],
  activePanelNodeId: null,
  startNodeId: null,
  endNodeId: null,
  creationMethod: null,
  activePlaceholder: null,
  workflowId: "",
  workflowName: "",
  editorCapabilities: {
    canViewEditor: true,
    canEditNodes: true,
    canSaveWorkflow: true,
    canRunWorkflow: true,
  },
  unsavedNodePositions: {},
  isDirty: false,
  _isSyncing: false,
};

const hasNode = (
  nodes: Node<FlowNodeData>[],
  nodeId: string | null,
): nodeId is string =>
  Boolean(nodeId && nodes.some((node) => node.id === nodeId));

const mergeNodesWithUnsavedPositions = (
  nodes: Node<FlowNodeData>[],
  unsavedNodePositions: Record<string, NodePosition>,
) =>
  nodes.map((node) => {
    const positionOverride = unsavedNodePositions[node.id];
    if (!positionOverride) {
      return node;
    }

    return {
      ...node,
      position: {
        x: positionOverride.x,
        y: positionOverride.y,
      },
    };
  });

export const useWorkflowStore = create<
  WorkflowEditorState & WorkflowEditorActions
>()(
  immer((set) => ({
    ...initialState,

    onNodesChange: (changes) =>
      set((state) => {
        state.nodes = applyNodeChanges<Node<FlowNodeData>>(
          changes as NodeChange<Node<FlowNodeData>>[],
          current(state.nodes),
        );

        if (!state._isSyncing) {
          changes.forEach((change) => {
            if (
              change.type === "position" &&
              change.position &&
              "id" in change
            ) {
              state.unsavedNodePositions[change.id] = {
                x: change.position.x,
                y: change.position.y,
              };
            }

            if (change.type === "remove" && "id" in change) {
              delete state.unsavedNodePositions[change.id];
            }
          });

          const hasDirtyChange = changes.some(
            (change) => change.type === "position" || change.type === "replace",
          );
          if (hasDirtyChange) {
            state.isDirty = true;
          }
        }
      }),

    onEdgesChange: (changes) =>
      set((state) => {
        state.edges = applyEdgeChanges(changes, current(state.edges));

        if (!state._isSyncing) {
          const hasDirtyChange = changes.some(
            (change) => change.type === "remove" || change.type === "replace",
          );
          if (hasDirtyChange) {
            state.isDirty = true;
          }
        }
      }),

    onConnect: (connection) =>
      set((state) => {
        state.edges = addEdge(connection, current(state.edges));
        if (!state._isSyncing) {
          state.isDirty = true;
        }
      }),

    updateNodeConfig: (id, config) =>
      set((state) => {
        const node = state.nodes.find((currentNode) => currentNode.id === id);
        if (!node) return;

        node.data.config = {
          ...node.data.config,
          ...config,
          isConfigured: true,
        } as FlowNodeData["config"];

        if (!state._isSyncing) {
          state.isDirty = true;
        }
      }),

    openPanel: (nodeId) =>
      set((state) => {
        state.activePanelNodeId = nodeId;
      }),

    closePanel: () =>
      set((state) => {
        state.activePanelNodeId = null;
      }),

    setStartNodeId: (id) =>
      set((state) => {
        state.startNodeId = id;
        if (!state._isSyncing) {
          state.isDirty = true;
        }
      }),

    setEndNodeId: (id) =>
      set((state) => {
        state.endNodeId = id;
        if (!state._isSyncing) {
          state.isDirty = true;
        }
      }),

    setCreationMethod: (method) =>
      set((state) => {
        state.creationMethod = method;
        if (!state._isSyncing) {
          state.isDirty = true;
        }
      }),

    setActivePlaceholder: (placeholder) =>
      set((state) => {
        state.activePlaceholder = placeholder;
      }),

    applyLayoutPositions: (updates) =>
      set((state) => {
        if (updates.length === 0) {
          return;
        }

        const nextPositionMap = Object.fromEntries(
          updates.map(({ nodeId, position }) => [nodeId, position]),
        );

        state.nodes = state.nodes.map((node) => {
          const nextPosition = nextPositionMap[node.id];
          if (!nextPosition) {
            return node;
          }

          state.unsavedNodePositions[node.id] = {
            x: nextPosition.x,
            y: nextPosition.y,
          };

          return {
            ...node,
            position: {
              x: nextPosition.x,
              y: nextPosition.y,
            },
          };
        });

        if (!state._isSyncing) {
          state.isDirty = true;
        }
      }),

    setWorkflowMeta: (id, name) =>
      set((state) => {
        state.workflowId = id;
        state.workflowName = name;
      }),

    hydrateWorkflow: (payload) =>
      set((state) => {
        state.workflowId = payload.workflowId;
        state.workflowName = payload.workflowName;
        state.nodes = payload.nodes;
        state.edges = payload.edges;
        state.startNodeId = payload.startNodeId;
        state.endNodeId = payload.endNodeId;
        state.creationMethod = payload.creationMethod;
        state.activePanelNodeId = null;
        state.activePlaceholder = null;
        state.unsavedNodePositions = {};
        state.isDirty = false;
        state._isSyncing = false;
      }),

    syncWorkflowGraph: (payload, options) =>
      set((state) => {
        const preserveActivePanelNodeId =
          options?.preserveActivePanelNodeId ?? true;
        const preserveActivePlaceholder =
          options?.preserveActivePlaceholder ?? true;
        const preserveDirty = options?.preserveDirty ?? true;
        const nextNodeIds = new Set(payload.nodes.map((node) => node.id));
        const preservedUnsavedNodePositions = Object.fromEntries(
          Object.entries(state.unsavedNodePositions).filter(([nodeId]) =>
            nextNodeIds.has(nodeId),
          ),
        );

        state.workflowId = payload.workflowId;
        state.workflowName = payload.workflowName;
        state.nodes = mergeNodesWithUnsavedPositions(
          payload.nodes,
          preservedUnsavedNodePositions,
        );
        state.edges = payload.edges;
        state.startNodeId = payload.startNodeId;
        state.endNodeId = payload.endNodeId;
        state.creationMethod = payload.creationMethod;
        state.unsavedNodePositions = preservedUnsavedNodePositions;
        state.activePanelNodeId = preserveActivePanelNodeId
          ? hasNode(payload.nodes, state.activePanelNodeId)
            ? state.activePanelNodeId
            : null
          : null;
        if (!preserveActivePlaceholder) {
          state.activePlaceholder = null;
        }
        state.isDirty = preserveDirty ? state.isDirty : false;
        state._isSyncing = false;
      }),

    setWorkflowName: (name) =>
      set((state) => {
        state.workflowName = name;
        state.isDirty = true;
      }),

    setEditorCapabilities: (capabilities) =>
      set((state) => {
        state.editorCapabilities = capabilities;
      }),

    clearUnsavedNodePositions: (nodeIds) =>
      set((state) => {
        if (!nodeIds || nodeIds.length === 0) {
          state.unsavedNodePositions = {};
          return;
        }

        nodeIds.forEach((nodeId) => {
          delete state.unsavedNodePositions[nodeId];
        });
      }),

    markClean: () =>
      set((state) => {
        state.unsavedNodePositions = {};
        state.isDirty = false;
      }),

    resetEditor: () => set(() => ({ ...initialState })),
  })),
);
