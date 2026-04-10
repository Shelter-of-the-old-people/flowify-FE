export const QUERY_KEYS = {
  workflows: ["workflows"] as const,
  workflow: (id: string) => ["workflows", id] as const,
  workflowChoices: (workflowId: string, prevNodeId: string) =>
    ["workflows", workflowId, "choices", prevNodeId] as const,
} as const;
