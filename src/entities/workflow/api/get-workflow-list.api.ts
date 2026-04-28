import { request } from "@/shared/api/core";

import { type RawWorkflowListResponse } from "./types";

export const getWorkflowListAPI = (
  page = 0,
  size = 20,
): Promise<RawWorkflowListResponse> =>
  request<RawWorkflowListResponse>({
    url: "/workflows",
    method: "GET",
    params: { page, size },
  });
