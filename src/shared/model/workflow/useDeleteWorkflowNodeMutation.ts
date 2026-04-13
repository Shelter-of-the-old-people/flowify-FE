import { useMutation } from "@tanstack/react-query";

import { workflowApi } from "../../api";
import { type MutationPolicyOptions, toMutationMeta } from "../query-policy";

import { syncWorkflowCache } from "./workflow-cache-utils";

type DeleteWorkflowNodeVariables = {
  workflowId: string;
  nodeId: string;
};

export const useDeleteWorkflowNodeMutation = (
  options?: MutationPolicyOptions<
    Awaited<ReturnType<typeof workflowApi.deleteNode>>,
    DeleteWorkflowNodeVariables
  >,
) =>
  useMutation({
    mutationFn: ({ workflowId, nodeId }: DeleteWorkflowNodeVariables) =>
      workflowApi.deleteNode(workflowId, nodeId),
    retry: options?.retry,
    meta: toMutationMeta(options),
    onSuccess: async (workflow, variables, onMutateResult, context) => {
      await syncWorkflowCache(workflow);
      await options?.onSuccess?.(workflow, variables, onMutateResult, context);
    },
    onError: async (error, variables, onMutateResult, context) => {
      await options?.onError?.(error, variables, onMutateResult, context);
    },
  });
