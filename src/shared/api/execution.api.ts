import type { ApiResponse } from "../types";

import { apiClient } from "./client";

export type ExecutionRunStatus = "pending" | "running" | "success" | "failed";

export interface ExecutionErrorDetail {
  code: string | null;
  message: string | null;
  stackTrace: string | null;
}

export interface ExecutionSnapshot {
  nodeId?: string | null;
  nodeType?: string | null;
  config?: Record<string, unknown> | null;
  inputDataType?: string | null;
  outputDataType?: string | null;
}

export interface ExecutionLog {
  id: string;
  nodeId: string;
  status: string;
  inputData?: Record<string, unknown> | null;
  outputData?: Record<string, unknown> | null;
  snapshot?: ExecutionSnapshot | null;
  error?: ExecutionErrorDetail | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface ExecutionDetail {
  id: string;
  workflowId: string;
  userId?: string | null;
  state: string;
  nodeLogs: ExecutionLog[];
  startedAt: string | null;
  finishedAt: string | null;
}

export const executionApi = {
  execute: (workflowId: string) =>
    apiClient.post<ApiResponse<string>>(`/workflows/${workflowId}/execute`),

  getList: (workflowId: string) =>
    apiClient.get<ApiResponse<ExecutionDetail[]>>(
      `/workflows/${workflowId}/executions`,
    ),

  getById: (workflowId: string, execId: string) =>
    apiClient.get<ApiResponse<ExecutionDetail>>(
      `/workflows/${workflowId}/executions/${execId}`,
    ),

  rollback: (workflowId: string, execId: string, nodeId?: string) =>
    apiClient.post<ApiResponse<void>>(
      `/workflows/${workflowId}/executions/${execId}/rollback`,
      undefined,
      {
        params: nodeId ? { nodeId } : undefined,
      },
    ),
};
