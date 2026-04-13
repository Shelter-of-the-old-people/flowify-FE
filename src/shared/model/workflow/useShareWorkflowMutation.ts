import { useMutation } from "@tanstack/react-query";

import type { ShareRequest } from "../../api";
import { workflowApi } from "../../api";
import { type MutationPolicyOptions, toMutationMeta } from "../query-policy";

import { invalidateWorkflowLists } from "./workflow-cache-utils";

type ShareWorkflowVariables = {
  workflowId: string;
  body: ShareRequest;
};

export const useShareWorkflowMutation = (
  options?: MutationPolicyOptions<void, ShareWorkflowVariables>,
) =>
  useMutation({
    mutationFn: ({ workflowId, body }: ShareWorkflowVariables) =>
      workflowApi.share(workflowId, body),
    retry: options?.retry,
    meta: toMutationMeta(options),
    onSuccess: async (_, variables, onMutateResult, context) => {
      await invalidateWorkflowLists();
      await options?.onSuccess?.(_, variables, onMutateResult, context);
    },
    onError: async (error, variables, onMutateResult, context) => {
      await options?.onError?.(error, variables, onMutateResult, context);
    },
  });
