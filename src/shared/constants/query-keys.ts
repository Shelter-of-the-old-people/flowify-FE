export const workflowKeys = {
  all: () => ["workflow"] as const,
  lists: () => [...workflowKeys.all(), "list"] as const,
  list: (params: { page: number; size: number }) =>
    [...workflowKeys.lists(), params.page, params.size] as const,
  infiniteList: (size: number) =>
    [...workflowKeys.lists(), "infinite", size] as const,
  details: () => [...workflowKeys.all(), "detail"] as const,
  detail: (id: string) => [...workflowKeys.details(), id] as const,
  choicesRoot: (workflowId: string) =>
    [...workflowKeys.detail(workflowId), "choices"] as const,
  choice: (workflowId: string, prevNodeId: string) =>
    [...workflowKeys.choicesRoot(workflowId), prevNodeId] as const,
} as const;

export const executionKeys = {
  all: () => ["execution"] as const,
  workflow: (workflowId: string) =>
    [...executionKeys.all(), "workflow", workflowId] as const,
  lists: (workflowId: string) =>
    [...executionKeys.workflow(workflowId), "list"] as const,
  detail: (workflowId: string, executionId: string) =>
    [...executionKeys.workflow(workflowId), "detail", executionId] as const,
} as const;

export const templateKeys = {
  all: () => ["template"] as const,
  lists: () => [...templateKeys.all(), "list"] as const,
  list: (category?: string) =>
    category
      ? ([...templateKeys.lists(), { category }] as const)
      : templateKeys.lists(),
  details: () => [...templateKeys.all(), "detail"] as const,
  detail: (id: string) => [...templateKeys.details(), id] as const,
} as const;

