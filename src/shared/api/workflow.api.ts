import type { Workflow, WorkflowSummary } from "@/entities/workflow";

import type { ApiResponse } from "../types";

import { apiClient } from "./client";

// ─── API 전용 타입 ──────────────────────────────────────────
export interface CreateWorkflowRequest {
  name: string;
}

export interface UpdateWorkflowRequest {
  name?: string;
  nodes?: Workflow["nodes"];
  edges?: Workflow["edges"];
}

export interface ExecuteWorkflowResponse {
  executionId: string;
  status: "pending" | "running";
}

// ─── API ────────────────────────────────────────────────
export const workflowApi = {
  /** 워크플로우 목록 조회 */
  getList: () => apiClient.get<ApiResponse<WorkflowSummary[]>>("/workflows"),

  /** 워크플로우 상세 조회 */
  getById: (id: string) =>
    apiClient.get<ApiResponse<Workflow>>(`/workflows/${id}`),

  /** 워크플로우 생성 */
  create: (body: CreateWorkflowRequest) =>
    apiClient.post<ApiResponse<Workflow>>("/workflows", body),

  /** 워크플로우 수정 (노드/엣지 저장 포함) */
  update: (id: string, body: UpdateWorkflowRequest) =>
    apiClient.put<ApiResponse<Workflow>>(`/workflows/${id}`, body),

  /** 워크플로우 삭제 */
  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/workflows/${id}`),

  /** 워크플로우 실행 */
  execute: (id: string) =>
    apiClient.post<ApiResponse<ExecuteWorkflowResponse>>(
      `/workflows/${id}/execute`,
    ),
};
