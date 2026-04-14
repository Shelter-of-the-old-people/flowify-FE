import { request } from "@/shared/api/core";

export const executeWorkflowAPI = (workflowId: string): Promise<string> =>
  request<string>({
    url: `/workflows/${workflowId}/execute`,
    method: "POST",
  });
