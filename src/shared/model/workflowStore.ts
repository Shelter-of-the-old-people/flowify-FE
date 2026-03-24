import {
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import { current } from "immer";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

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

  /** 노드 삭제 (연결된 엣지도 함께 제거) */
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

  /** 에디터 상태 초기화 (페이지 이탈 시 호출) */
  resetEditor: () => void;
}

// ─── 초기 상태 ───────────────────────────────────────────────
const initialState: WorkflowEditorState = {
  nodes: [],
  edges: [],
  activePanelNodeId: null,
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
        state.nodes = state.nodes.filter((n) => n.id !== id);
        state.edges = state.edges.filter(
          (e) => e.source !== id && e.target !== id,
        );
        if (state.activePanelNodeId === id) {
          state.activePanelNodeId = null;
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

// ─── 파생 셀렉터 ─────────────────────────────────────────────
// useWorkflowStore(selectActiveNode) 형태로 구독 범위를 최소화합니다.

export const selectActiveNode = (
  state: WorkflowEditorState & WorkflowEditorActions,
): Node | null =>
  state.nodes.find((n) => n.id === state.activePanelNodeId) ?? null;

export const selectIsConfigured =
  (id: string) =>
  (state: WorkflowEditorState & WorkflowEditorActions): boolean => {
    const node = state.nodes.find((n) => n.id === id);
    return (
      (node?.data as Record<string, unknown> | undefined)?.isConfigured === true
    );
  };
