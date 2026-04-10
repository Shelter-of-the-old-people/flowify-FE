import type { ApiResponse } from "../types";

import { apiClient } from "./client";
import type { WorkflowResponse } from "./workflow.api";

export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  category: string | null;
  icon?: string | null;
  requiredServices: string[];
  isSystem: boolean;
  authorId?: string | null;
  useCount: number;
  createdAt: string;
}

export interface TemplateDetail extends TemplateSummary {
  nodes: import("./workflow.api").NodeDefinitionResponse[];
  edges: import("./workflow.api").EdgeDefinitionResponse[];
}

export interface CreateTemplateRequest {
  workflowId: string;
  name: string;
  description?: string | null;
  category: string;
  icon?: string | null;
}

export const templateApi = {
  getList: (category?: string) =>
    apiClient.get<ApiResponse<TemplateSummary[]>>("/templates", {
      params: category ? { category } : undefined,
    }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<TemplateDetail>>(`/templates/${id}`),

  instantiate: (id: string) =>
    apiClient.post<ApiResponse<WorkflowResponse>>(
      `/templates/${id}/instantiate`,
    ),

  create: (body: CreateTemplateRequest) =>
    apiClient.post<ApiResponse<TemplateDetail>>("/templates", body),
};
