import { request } from "@/shared/api/core";

import { type ExecutionSummary } from "./types";

export const getExecutionListAPI = (
  workflowId: string,
): Promise<ExecutionSummary[]> =>
  request<ExecutionSummary[]>({
    url: `/workflows/${workflowId}/executions`,
    method: "GET",
  });
