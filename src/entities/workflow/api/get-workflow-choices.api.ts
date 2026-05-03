import { request } from "@/shared/api/core";

import { type ChoiceQueryContext, type ChoiceResponse } from "./types";

const toWorkflowChoicesQueryParams = (context?: ChoiceQueryContext) => {
  if (!context) {
    return undefined;
  }

  const params: Record<string, string> = {};
  const service = context.service?.trim();
  const fileSubtype = context.file_subtype?.trim();

  if (service) {
    params.service = service;
  }

  if (fileSubtype) {
    params.file_subtype = fileSubtype;
  }

  return Object.keys(params).length > 0 ? params : undefined;
};

export const getWorkflowChoicesAPI = (
  workflowId: string,
  prevNodeId: string,
  context?: ChoiceQueryContext,
): Promise<ChoiceResponse> =>
  request<ChoiceResponse>({
    url: `/workflows/${workflowId}/choices/${prevNodeId}`,
    method: "GET",
    params: toWorkflowChoicesQueryParams(context),
  });
