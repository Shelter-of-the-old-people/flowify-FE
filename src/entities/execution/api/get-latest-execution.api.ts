import { request } from "@/shared/api/core";

import { type ExecutionSummary } from "./types";

export const getLatestExecutionAPI = async (
  workflowId: string,
): Promise<ExecutionSummary | null> => {
  const data = await request<ExecutionSummary | null | undefined>({
    url: `/workflows/${workflowId}/executions/latest`,
    method: "GET",
  });

  return data ?? null;
};
