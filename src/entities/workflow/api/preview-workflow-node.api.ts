import { request } from "@/shared/api/core";

import { type NodePreviewRequest, type NodePreviewResponse } from "./types";

export const previewWorkflowNodeAPI = (
  workflowId: string,
  nodeId: string,
  payload: NodePreviewRequest = {},
): Promise<NodePreviewResponse> =>
  request<NodePreviewResponse>({
    url: `/workflows/${workflowId}/nodes/${nodeId}/preview`,
    method: "POST",
    data: payload,
  });
