export const workflowMutationKeys = {
  all: ["workflow-mutation"] as const,
  save: ["workflow-mutation", "save"] as const,
  structure: ["workflow-mutation", "structure"] as const,
  nodeConfig: ["workflow-mutation", "node-config"] as const,
};
