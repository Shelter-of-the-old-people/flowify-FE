export const executionKeys = {
  all: () => ["execution"] as const,
  workflow: (workflowId: string) =>
    [...executionKeys.all(), "workflow", workflowId] as const,
  lists: (workflowId: string) =>
    [...executionKeys.workflow(workflowId), "list"] as const,
  detail: (workflowId: string, executionId: string) =>
    [...executionKeys.workflow(workflowId), "detail", executionId] as const,
} as const;
