import type { ApiResponse } from "../types";

import { apiClient } from "./client";

export type ExecutionRunStatus = "pending" | "running" | "success" | "failed";

export interface ExecutionSummary {
  id: string;
  workflowId: string;
  status: ExecutionRunStatus;
  startedAt: string;
  finishedAt: string | null;
}

export interface ExecutionLog {
  nodeId: string;
  status: ExecutionRunStatus;
  message: string;
  timestamp: string;
}

export interface ExecutionDetail extends ExecutionSummary {
  logs: ExecutionLog[];
  errorMessage: string | null;
}

export interface ExecutionStartResponse {
  executionId: string;
}

export const executionApi = {
  execute: (workflowId: string) =>
    apiClient.post<ApiResponse<ExecutionStartResponse>>(
      `/workflows/${workflowId}/execute`,
    ),

  getList: (workflowId: string) =>
    apiClient.get<ApiResponse<ExecutionSummary[]>>(
      `/workflows/${workflowId}/executions`,
    ),

  getById: (workflowId: string, execId: string) =>
    apiClient.get<ApiResponse<ExecutionDetail>>(
      `/workflows/${workflowId}/executions/${execId}`,
    ),

  rollback: (workflowId: string, execId: string) =>
    apiClient.post<ApiResponse<void>>(
      `/workflows/${workflowId}/executions/${execId}/rollback`,
    ),
};
