import { request } from "@/shared/api/core";

export const rollbackExecutionAPI = (
  workflowId: string,
  executionId: string,
  nodeId?: string,
): Promise<void> =>
  request<void>({
    url: `/workflows/${workflowId}/executions/${executionId}/rollback`,
    method: "POST",
    params: nodeId ? { nodeId } : undefined,
  });
