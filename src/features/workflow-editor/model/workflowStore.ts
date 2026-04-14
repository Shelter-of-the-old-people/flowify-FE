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

import { type ExecutionStatus } from "@/entities/execution";
import { type FlowNodeData } from "@/entities/node";
import { collectDescendantIds } from "@/shared/libs/graph";

import { type WorkflowHydratedState } from "./workflow-editor-adapter";

type PlaceholderInfo = {
  id: string;
  position: { x: number; y: number };
};

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
  executionStatus: ExecutionStatus;
}

interface WorkflowEditorActions {
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: Node<FlowNodeData>) => void;
  removeNode: (id: string) => void;
  updateNodeConfig: (
    id: string,
    config: Partial<FlowNodeData["config"]>,
  ) => void;
  openPanel: (nodeId: string) => void;
  closePanel: () => void;
  setWorkflowMeta: (id: string, name: string) => void;
  hydrateWorkflow: (payload: WorkflowHydratedState) => void;
  setWorkflowName: (name: string) => void;
  setExecutionStatus: (status: ExecutionStatus) => void;
  setStartNodeId: (id: string | null) => void;
  setEndNodeId: (id: string | null) => void;
  setCreationMethod: (method: "manual" | null) => void;
  setActivePlaceholder: (placeholder: PlaceholderInfo | null) => void;
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
  executionStatus: "idle",
};

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
      }),

    onEdgesChange: (changes) =>
      set((state) => {
        state.edges = applyEdgeChanges(changes, current(state.edges));
      }),

    onConnect: (connection) =>
      set((state) => {
        state.edges = addEdge(connection, current(state.edges));
      }),

    addNode: (node) =>
      set((state) => {
        state.nodes.push(node);
      }),

    removeNode: (id) =>
      set((state) => {
        const plainEdges = current(state.edges);
        const descendants = collectDescendantIds(id, plainEdges);
        const removeTargets = new Set([id, ...descendants]);

        state.nodes = state.nodes.filter((node) => !removeTargets.has(node.id));
        state.edges = state.edges.filter(
          (edge) =>
            !removeTargets.has(edge.source) && !removeTargets.has(edge.target),
        );

        if (
          state.activePanelNodeId &&
          removeTargets.has(state.activePanelNodeId)
        ) {
          state.activePanelNodeId = null;
        }

        if (state.startNodeId && removeTargets.has(state.startNodeId)) {
          state.startNodeId = null;
          state.creationMethod = null;
        }

        if (state.endNodeId && removeTargets.has(state.endNodeId)) {
          state.endNodeId = null;
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
      }),

    setEndNodeId: (id) =>
      set((state) => {
        state.endNodeId = id;
      }),

    setCreationMethod: (method) =>
      set((state) => {
        state.creationMethod = method;
      }),

    setActivePlaceholder: (placeholder) =>
      set((state) => {
        state.activePlaceholder = placeholder;
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
      }),

    setWorkflowName: (name) =>
      set((state) => {
        state.workflowName = name;
      }),

    setExecutionStatus: (status) =>
      set((state) => {
        state.executionStatus = status;
      }),

    resetEditor: () => set(() => ({ ...initialState })),
  })),
);
