import { request } from "@/shared/api/core";

import { type SchemaPreviewRequest, type SchemaPreviewResponse } from "./types";

export const previewWorkflowSchemaAPI = (
  body: SchemaPreviewRequest,
): Promise<SchemaPreviewResponse> =>
  request<SchemaPreviewResponse>({
    url: "/workflows/schema-preview",
    method: "POST",
    data: body,
  });
