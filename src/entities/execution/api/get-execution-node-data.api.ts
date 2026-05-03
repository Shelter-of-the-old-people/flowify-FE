import { request } from "@/shared/api/core";

import { type ExecutionNodeData } from "./types";

export const getExecutionNodeDataAPI = (
  workflowId: string,
  executionId: string,
  nodeId: string,
): Promise<ExecutionNodeData> =>
  request<ExecutionNodeData>({
    url: `/workflows/${workflowId}/executions/${executionId}/nodes/${nodeId}/data`,
    method: "GET",
  });
