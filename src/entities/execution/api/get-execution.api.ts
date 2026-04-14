import { request } from "@/shared/api/core";

import type { ExecutionDetail } from "./types";

export const getExecutionAPI = (
  workflowId: string,
  executionId: string,
): Promise<ExecutionDetail> =>
  request<ExecutionDetail>({
    url: `/workflows/${workflowId}/executions/${executionId}`,
    method: "GET",
  });
