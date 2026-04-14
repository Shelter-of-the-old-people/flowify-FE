import { useMutation } from "@tanstack/react-query";

import { type MutationPolicyOptions, toMutationMeta } from "@/shared/api";
import { queryClient } from "@/shared/libs";

import { executionApi } from "../api";

import { executionKeys } from "./query-keys";

export const useExecuteWorkflowMutation = (
  options?: MutationPolicyOptions<string, string>,
) =>
  useMutation({
    mutationFn: (workflowId: string) => executionApi.execute(workflowId),
    retry: options?.retry,
    meta: toMutationMeta(options),
    onSuccess: async (data, workflowId, onMutateResult, context) => {
      await queryClient.invalidateQueries({
        queryKey: executionKeys.workflow(workflowId),
      });
      await options?.onSuccess?.(data, workflowId, onMutateResult, context);
    },
    onError: async (error, workflowId, onMutateResult, context) => {
      await options?.onError?.(error, workflowId, onMutateResult, context);
    },
  });

