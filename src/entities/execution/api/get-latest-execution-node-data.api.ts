import { request } from "@/shared/api/core";

import { type ExecutionNodeData } from "./types";

export const getLatestExecutionNodeDataAPI = (
  workflowId: string,
  nodeId: string,
): Promise<ExecutionNodeData> =>
  request<ExecutionNodeData>({
    url: `/workflows/${workflowId}/executions/latest/nodes/${nodeId}/data`,
    method: "GET",
  });
