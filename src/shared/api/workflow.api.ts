import type { Workflow, WorkflowSummary } from "@/entities/workflow";

import type { ApiResponse } from "../types";

import { apiClient } from "./client";

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

export type NodeDefinitionRole = "start" | "end" | "middle";

export interface NodeDefinitionResponse {
  id: string;
  type: string;
  label: string;
  role: NodeDefinitionRole;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  dataType: string | null;
  outputDataType: string | null;
  authWarning?: boolean;
}

export interface NodeAddRequest {
  type: string;
  label: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  prevNodeId: string;
}

export interface NodeUpdateRequest {
  config: Record<string, unknown>;
}

export interface NodeChoiceSelectRequest {
  actionId: string;
  processingMethod?: string;
  options?: Record<string, unknown>;
}

export interface ShareRequest {
  userIds: string[];
}

export interface WorkflowGenerateRequest {
  prompt: string;
}

export interface ChoiceOption {
  id: string;
  label: string;
}

export interface ChoiceFollowUp {
  question: string;
  options: ChoiceOption[];
}

export interface ChoiceBranchConfig {
  type: string;
  options: ChoiceOption[];
}

export interface ChoiceAction {
  id: string;
  label: string;
  nodeType: string;
  outputDataType: string;
  priority: number;
  followUp?: ChoiceFollowUp;
  branchConfig?: ChoiceBranchConfig;
}

export interface ProcessingMethod {
  id: string;
  label: string;
}

export interface ChoiceResponse {
  dataType: string;
  requiresProcessingMethod: boolean;
  processingMethods?: ProcessingMethod[];
  actions: ChoiceAction[];
}

export interface NodeSelectionResult {
  nodeType: string;
  label: string;
  outputDataType: string;
  config: Record<string, unknown>;
}

export const workflowApi = {
  getList: () => apiClient.get<ApiResponse<WorkflowSummary[]>>("/workflows"),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Workflow>>(`/workflows/${id}`),

  create: (body: CreateWorkflowRequest) =>
    apiClient.post<ApiResponse<Workflow>>("/workflows", body),

  update: (id: string, body: UpdateWorkflowRequest) =>
    apiClient.put<ApiResponse<Workflow>>(`/workflows/${id}`, body),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/workflows/${id}`),

  execute: (id: string) =>
    apiClient.post<ApiResponse<ExecuteWorkflowResponse>>(
      `/workflows/${id}/execute`,
    ),

  addNode: (workflowId: string, body: NodeAddRequest) =>
    apiClient.post<ApiResponse<NodeDefinitionResponse>>(
      `/workflows/${workflowId}/nodes`,
      body,
    ),

  updateNode: (workflowId: string, nodeId: string, body: NodeUpdateRequest) =>
    apiClient.put<ApiResponse<NodeDefinitionResponse>>(
      `/workflows/${workflowId}/nodes/${nodeId}`,
      body,
    ),

  deleteNode: (workflowId: string, nodeId: string) =>
    apiClient.delete<ApiResponse<void>>(
      `/workflows/${workflowId}/nodes/${nodeId}`,
    ),

  getChoices: (workflowId: string, prevNodeId: string) =>
    apiClient.get<ApiResponse<ChoiceResponse>>(
      `/workflows/${workflowId}/choices/${prevNodeId}`,
    ),

  selectChoice: (
    workflowId: string,
    prevNodeId: string,
    body: NodeChoiceSelectRequest,
  ) =>
    apiClient.post<ApiResponse<NodeSelectionResult>>(
      `/workflows/${workflowId}/choices/${prevNodeId}/select`,
      body,
    ),

  share: (workflowId: string, body: ShareRequest) =>
    apiClient.post<ApiResponse<void>>(`/workflows/${workflowId}/share`, body),

  generate: (body: WorkflowGenerateRequest) =>
    apiClient.post<ApiResponse<Workflow>>("/workflows/generate", body),
};
