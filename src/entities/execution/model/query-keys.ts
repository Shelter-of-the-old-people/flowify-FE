export const executionKeys = {
  all: () => ["execution"] as const,
  workflow: (workflowId: string) =>
    [...executionKeys.all(), "workflow", workflowId] as const,
  lists: (workflowId: string) =>
    [...executionKeys.workflow(workflowId), "list"] as const,
  latest: (workflowId: string) =>
    [...executionKeys.workflow(workflowId), "latest"] as const,
  detail: (workflowId: string, executionId: string) =>
    [...executionKeys.workflow(workflowId), "detail", executionId] as const,
  nodeData: (workflowId: string, executionId: string, nodeId: string) =>
    [
      ...executionKeys.detail(workflowId, executionId),
      "node",
      nodeId,
      "data",
    ] as const,
  latestNodeData: (workflowId: string, nodeId: string) =>
    [...executionKeys.latest(workflowId), "node", nodeId, "data"] as const,
} as const;
