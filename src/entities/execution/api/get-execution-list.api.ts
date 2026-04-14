import { request } from "@/shared/api/core";

import type { ExecutionDetail } from "./types";

export const getExecutionListAPI = (
  workflowId: string,
): Promise<ExecutionDetail[]> =>
  request<ExecutionDetail[]>({
    url: `/workflows/${workflowId}/executions`,
    method: "GET",
  });
