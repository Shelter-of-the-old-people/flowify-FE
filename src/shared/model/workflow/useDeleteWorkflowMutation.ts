import { useMutation } from "@tanstack/react-query";

import { workflowApi } from "../../api";
import { type MutationPolicyOptions, toMutationMeta } from "../query-policy";

import { removeWorkflowDomainCache } from "./workflow-cache-utils";

export const useDeleteWorkflowMutation = (
  options?: MutationPolicyOptions<void, string>,
) =>
  useMutation({
    mutationFn: (workflowId: string) => workflowApi.delete(workflowId),
    retry: options?.retry,
    meta: toMutationMeta(options),
    onSuccess: async (_, workflowId, onMutateResult, context) => {
      await removeWorkflowDomainCache(workflowId);
      await options?.onSuccess?.(_, workflowId, onMutateResult, context);
    },
    onError: async (error, workflowId, onMutateResult, context) => {
      await options?.onError?.(error, workflowId, onMutateResult, context);
    },
  });
