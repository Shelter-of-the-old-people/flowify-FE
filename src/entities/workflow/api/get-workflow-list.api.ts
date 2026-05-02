import { request } from "@/shared/api/core";

import { type WorkflowListResponse, type WorkflowResponse } from "./types";

const normalizeWorkflowListResponse = (
  response: WorkflowListResponse | WorkflowResponse[],
  page: number,
  size: number,
): WorkflowListResponse => {
  if (!Array.isArray(response)) {
    return response;
  }

  return {
    content: response,
    page,
    size: response.length > 0 ? response.length : size,
    totalElements: response.length,
    totalPages: response.length > 0 ? 1 : 0,
  };
};

export const getWorkflowListAPI = (
  page = 0,
  size = 20,
): Promise<WorkflowListResponse> =>
  request<WorkflowListResponse | WorkflowResponse[]>({
    url: "/workflows",
    method: "GET",
    params: { page, size },
  }).then((response) => normalizeWorkflowListResponse(response, page, size));
