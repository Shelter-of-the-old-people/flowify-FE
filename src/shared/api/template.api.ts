import type { Workflow } from "@/entities/workflow";

import type { ApiResponse } from "../types";

import { apiClient } from "./client";

export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateDetail extends TemplateSummary {
  workflowId: string | null;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category?: string;
  workflowId?: string;
}

export const templateApi = {
  getList: (category?: string) =>
    apiClient.get<ApiResponse<TemplateSummary[]>>("/templates", {
      params: category ? { category } : undefined,
    }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<TemplateDetail>>(`/templates/${id}`),

  instantiate: (id: string) =>
    apiClient.post<ApiResponse<Workflow>>(`/templates/${id}/instantiate`),

  create: (body: CreateTemplateRequest) =>
    apiClient.post<ApiResponse<TemplateDetail>>("/templates", body),
};
