import { type Edge } from "@xyflow/react";

// ─── 엣지 확장 타입 ──────────────────────────────────────────
export interface FlowEdgeData extends Record<string, unknown> {
  /** 화면에 표시할 edge 라벨 */
  label?: string;
  /** backend 라우팅에 사용하는 raw branch key */
  branchKey?: string;
  /** 커스텀 엣지 렌더러 종류 */
  variant?: "flow-arrow";
}

export type FlowEdge = Edge<FlowEdgeData>;
