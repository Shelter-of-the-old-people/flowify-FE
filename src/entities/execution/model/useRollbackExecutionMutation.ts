import { useMutation } from "@tanstack/react-query";

import { type MutationPolicyOptions, toMutationMeta } from "@/shared/api";
import { queryClient } from "@/shared/libs";

import { executionApi } from "../api";

import { executionKeys } from "./query-keys";

type RollbackExecutionVariables = {
  workflowId: string;
  executionId: string;
  nodeId?: string;
};

export const useRollbackExecutionMutation = (
  options?: MutationPolicyOptions<void, RollbackExecutionVariables>,
) =>
  useMutation({
    mutationFn: ({
      workflowId,
      executionId,
      nodeId,
    }: RollbackExecutionVariables) =>
      executionApi.rollback(workflowId, executionId, nodeId),
    retry: options?.retry,
    meta: toMutationMeta(options),
    onSuccess: async (_, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({
        queryKey: executionKeys.workflow(variables.workflowId),
      });
      await options?.onSuccess?.(_, variables, onMutateResult, context);
    },
    onError: async (error, variables, onMutateResult, context) => {
      await options?.onError?.(error, variables, onMutateResult, context);
    },
  });

