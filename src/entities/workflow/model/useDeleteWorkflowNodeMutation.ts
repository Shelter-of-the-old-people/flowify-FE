import { useMutation } from "@tanstack/react-query";

import { type MutationPolicyOptions, toMutationMeta } from "@/shared/api";

import { workflowApi } from "../api";

import { workflowMutationKeys } from "./mutation-keys";
import {
  getWorkflowDetailOrFallback,
  syncWorkflowCache,
} from "./workflow-cache-utils";

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
    mutationKey: workflowMutationKeys.structure,
    mutationFn: async ({ workflowId, nodeId }: DeleteWorkflowNodeVariables) => {
      const workflow = await workflowApi.deleteNode(workflowId, nodeId);
      return getWorkflowDetailOrFallback(workflowId, workflow);
    },
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
