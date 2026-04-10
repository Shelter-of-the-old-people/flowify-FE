export const QUERY_KEYS = {
  workflows: ["workflows"] as const,
  workflow: (id: string) => ["workflows", id] as const,
  workflowChoices: (workflowId: string, prevNodeId: string) =>
    ["workflows", workflowId, "choices", prevNodeId] as const,
  templates: (category?: string) =>
    category
      ? (["templates", { category }] as const)
      : (["templates"] as const),
  template: (id: string) => ["templates", id] as const,
  executions: (workflowId: string) =>
    ["workflows", workflowId, "executions"] as const,
  execution: (workflowId: string, execId: string) =>
    ["workflows", workflowId, "executions", execId] as const,
  oauthTokens: ["oauth-tokens"] as const,
} as const;
