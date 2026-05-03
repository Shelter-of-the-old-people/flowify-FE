import { request } from "@/shared/api/core";

import { type NodeSchemaPreviewResponse } from "./types";

export const getWorkflowNodeSchemaPreviewAPI = (
  workflowId: string,
  nodeId: string,
): Promise<NodeSchemaPreviewResponse> =>
  request<NodeSchemaPreviewResponse>({
    url: `/workflows/${workflowId}/nodes/${nodeId}/schema-preview`,
    method: "GET",
  });
