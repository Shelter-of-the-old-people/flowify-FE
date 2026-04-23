import { request } from "@/shared/api/core";

import { type SchemaPreviewResponse } from "./types";

export const getWorkflowSchemaPreviewAPI = (
  workflowId: string,
): Promise<SchemaPreviewResponse> =>
  request<SchemaPreviewResponse>({
    url: `/workflows/${workflowId}/schema-preview`,
    method: "GET",
  });
