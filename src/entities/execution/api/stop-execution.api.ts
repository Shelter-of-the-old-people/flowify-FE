import { request } from "@/shared/api/core";

export const stopExecutionAPI = (
  workflowId: string,
  executionId: string,
): Promise<void> =>
  request<void>({
    url: `/workflows/${workflowId}/executions/${executionId}/stop`,
    method: "POST",
  });
