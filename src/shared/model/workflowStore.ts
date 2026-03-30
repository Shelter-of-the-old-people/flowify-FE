import { addEdge, applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import type {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
} from "@xyflow/react";
import { current } from "immer";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { collectDescendantIds } from "../libs/graph";

// ─── 실행 상태 타입 ──────────────────────────────────────────
export type ExecutionStatus = "idle" | "running" | "success" | "failed";

// ─── State ───────────────────────────────────────────────────
interface WorkflowEditorState {
  /** React Flow 노드 목록 */
  nodes: Node[];
  /** React Flow 엣지 목록 */
  edges: Edge[];
  /** 현재 설정 패널이 열린 노드 ID (null이면 패널 닫힘) */
  activePanelNodeId: string | null;
  /** 시작 노드 ID (null이면 미설정) */
  startNodeId: string | null;
  /** 도착 노드 ID (null이면 미설정) */
  endNodeId: string | null;
  /** 생성 방식 (null이면 미결정) */
  creationMethod: "manual" | null;
  /** 현재 클릭된 placeholder 정보 (null이면 선택 패널 닫힘) */
  activePlaceholder: {
    id: string;
    position: { x: number; y: number };
  } | null;
  /** 현재 편집 중인 워크플로우 ID */
  workflowId: string;
  /** 워크플로우 이름 */
  workflowName: string;
  /** 실행 상태 */
  executionStatus: ExecutionStatus;
}

// ─── Actions ─────────────────────────────────────────────────
interface WorkflowEditorActions {
  // React Flow 이벤트 핸들러
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  /**
   * 노드 추가
   * — add-node feature에서 NODE_REGISTRY로 완성한 Node 객체를 전달합니다.
   * — 스토어는 도메인 타입을 알 필요 없이 상태만 관리합니다.
   */
  addNode: (node: Node) => void;

  /** 노드 삭제 (후속 노드 및 관련 엣지도 함께 제거) */
  removeNode: (id: string) => void;

  /**
   * 노드 config 업데이트
   * — configure-node feature에서 타입별 config를 전달합니다.
   * — isConfigured: true를 자동으로 주입합니다.
   */
  updateNodeConfig: (id: string, config: Record<string, unknown>) => void;

  /** 설정 패널 열기 */
  openPanel: (nodeId: string) => void;

  /** 설정 패널 닫기 */
  closePanel: () => void;

  /** 워크플로우 메타 설정 (페이지 진입 시 호출) */
  setWorkflowMeta: (id: string, name: string) => void;

  /** 워크플로우 이름만 단독 변경 (인라인 편집 시 호출) */
  setWorkflowName: (name: string) => void;

  /** 실행 상태 변경 */
  setExecutionStatus: (status: ExecutionStatus) => void;

  /** 시작 노드 ID 설정 */
  setStartNodeId: (id: string | null) => void;

  /** 도착 노드 ID 설정 */
  setEndNodeId: (id: string | null) => void;

  /** 생성 방식 설정 */
  setCreationMethod: (method: "manual" | null) => void;

  /** 활성 placeholder 설정 (서비스 선택 패널 열기/닫기) */
  setActivePlaceholder: (
    placeholder: { id: string; position: { x: number; y: number } } | null,
  ) => void;

  /** 에디터 상태 초기화 (페이지 이탈 시 호출) */
  resetEditor: () => void;
}

// ─── 초기 상태 ───────────────────────────────────────────────
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

// ─── Store ───────────────────────────────────────────────────
export const useWorkflowStore = create<
  WorkflowEditorState & WorkflowEditorActions
>()(
  immer((set) => ({
    ...initialState,

    // ── React Flow 핸들러 ──────────────────────────────────
    // immer draft를 React Flow 유틸에 넘기기 전 current()로 plain 객체 변환
    onNodesChange: (changes) =>
      set((state) => {
        state.nodes = applyNodeChanges(changes, current(state.nodes));
      }),

    onEdgesChange: (changes) =>
      set((state) => {
        state.edges = applyEdgeChanges(changes, current(state.edges));
      }),

    onConnect: (connection) =>
      set((state) => {
        state.edges = addEdge(connection, current(state.edges));
      }),

    // ── 노드 조작 ─────────────────────────────────────────
    addNode: (node) =>
      set((state) => {
        state.nodes.push(node);
      }),

    removeNode: (id) =>
      set((state) => {
        const plainEdges = current(state.edges);
        const descendants = collectDescendantIds(id, plainEdges);
        const removeTargets = new Set([id, ...descendants]);

        state.nodes = state.nodes.filter((n) => !removeTargets.has(n.id));
        state.edges = state.edges.filter(
          (e) => !removeTargets.has(e.source) && !removeTargets.has(e.target),
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
          state.creationMethod = null;
        }
      }),

    updateNodeConfig: (id, config) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === id);
        if (node) {
          node.data = {
            ...node.data,
            config: { ...config, isConfigured: true },
          };
        }
      }),

    // ── 패널 조작 ─────────────────────────────────────────
    openPanel: (nodeId) =>
      set((state) => {
        state.activePanelNodeId = nodeId;
      }),

    closePanel: () =>
      set((state) => {
        state.activePanelNodeId = null;
      }),

    // ── 시작 / 도착 노드 ──────────────────────────────────
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

    // ── 메타 / 실행 상태 ──────────────────────────────────
    setWorkflowMeta: (id, name) =>
      set((state) => {
        state.workflowId = id;
        state.workflowName = name;
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
