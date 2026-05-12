import { request } from "@/shared/api/core";

import {
  type RawWorkflowListResponse,
  type WorkflowListStatusFilter,
} from "./types";

export const getWorkflowListAPI = (
  page = 0,
  size = 20,
  status: WorkflowListStatusFilter = "all",
): Promise<RawWorkflowListResponse> =>
  request<RawWorkflowListResponse>({
    url: "/workflows",
    method: "GET",
    params: { page, size, status },
  });
