import type { Edge } from "@xyflow/react";

// ─── 엣지 확장 타입 ──────────────────────────────────────────
export interface FlowEdgeData extends Record<string, unknown> {
  /** 조건 분기 엣지에서 표시할 레이블 (예: "true", "false", "case 1") */
  label?: string;
  /** 커스텀 엣지 렌더러 종류 */
  variant?: "flow-arrow";
}

export type FlowEdge = Edge<FlowEdgeData>;
