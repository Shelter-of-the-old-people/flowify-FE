import type { TriggerConfig, Workflow } from "@/entities/workflow";

import type { ApiResponse, PageResponse, ValidationWarning } from "../types";

import { apiClient } from "./client";

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  nodes?: NodeDefinitionResponse[];
  edges?: EdgeDefinitionResponse[];
  trigger?: TriggerConfig | null;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  nodes?: NodeDefinitionResponse[];
  edges?: EdgeDefinitionResponse[];
  trigger?: TriggerConfig | null;
  active?: boolean;
}

export type NodeDefinitionRole = "start" | "end" | "middle";

export interface NodeDefinitionResponse {
  id: string;
  category?: string;
  type: string;
  label?: string;
  role: NodeDefinitionRole;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  dataType: string | null;
  outputDataType: string | null;
  authWarning: boolean;
}

export interface EdgeDefinitionResponse {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface WorkflowResponse extends Omit<Workflow, "nodes" | "edges"> {
  nodes: NodeDefinitionResponse[];
  edges: EdgeDefinitionResponse[];
  warnings?: ValidationWarning[];
}

export interface NodeAddRequest {
  category: string;
  type: string;
  position: { x: number; y: number };
  config?: Record<string, unknown>;
  dataType?: string | null;
  outputDataType?: string | null;
  role?: NodeDefinitionRole;
  authWarning?: boolean;
  prevNodeId?: string;
}

export interface NodeUpdateRequest {
  category?: string;
  type?: string;
  config?: Record<string, unknown>;
  position?: { x: number; y: number };
  dataType?: string | null;
  outputDataType?: string | null;
  role?: NodeDefinitionRole;
  authWarning?: boolean;
}

export interface NodeChoiceSelectRequest {
  selectedOptionId: string;
  dataType: string;
  context?: Record<string, unknown>;
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
  type?: string | null;
  node_type?: string | null;
  output_data_type?: string | null;
  priority?: number | null;
}

export interface ChoiceFollowUp {
  question: string;
  options: ChoiceOption[];
  options_source?: string | null;
  multi_select?: boolean | null;
  description?: string | null;
}

export type ChoiceBranchConfig = ChoiceFollowUp;

export interface ChoiceResponse {
  question: string;
  options: ChoiceOption[];
  requiresProcessingMethod: boolean;
  multiSelect?: boolean | null;
}

export interface NodeSelectionResult {
  nodeType: string | null;
  outputDataType: string | null;
  followUp?: ChoiceFollowUp | null;
  branchConfig?: ChoiceBranchConfig | null;
}

export const workflowApi = {
  getList: (page = 0, size = 20) =>
    apiClient.get<ApiResponse<PageResponse<WorkflowResponse>>>("/workflows", {
      params: { page, size },
    }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<WorkflowResponse>>(`/workflows/${id}`),

  create: (body: CreateWorkflowRequest) =>
    apiClient.post<ApiResponse<WorkflowResponse>>("/workflows", body),

  update: (id: string, body: UpdateWorkflowRequest) =>
    apiClient.put<ApiResponse<WorkflowResponse>>(`/workflows/${id}`, body),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/workflows/${id}`),

  addNode: (workflowId: string, body: NodeAddRequest) =>
    apiClient.post<ApiResponse<WorkflowResponse>>(
      `/workflows/${workflowId}/nodes`,
      body,
    ),

  updateNode: (workflowId: string, nodeId: string, body: NodeUpdateRequest) =>
    apiClient.put<ApiResponse<WorkflowResponse>>(
      `/workflows/${workflowId}/nodes/${nodeId}`,
      body,
    ),

  deleteNode: (workflowId: string, nodeId: string) =>
    apiClient.delete<ApiResponse<WorkflowResponse>>(
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
    apiClient.post<ApiResponse<WorkflowResponse>>("/workflows/generate", body),
};
