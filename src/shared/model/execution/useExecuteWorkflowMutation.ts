import { useMutation } from "@tanstack/react-query";

import { executionApi } from "../../api";
import { executionKeys } from "../../constants";
import { queryClient } from "../../libs";
import { type MutationPolicyOptions, toMutationMeta } from "../query-policy";

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
