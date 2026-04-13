import { useMutation } from "@tanstack/react-query";

import { workflowApi } from "../../api";
import { type MutationPolicyOptions, toMutationMeta } from "../query-policy";

import { syncWorkflowCache } from "./workflow-cache-utils";

export const useGenerateWorkflowMutation = (
  options?: MutationPolicyOptions<
    Awaited<ReturnType<typeof workflowApi.generate>>,
    Parameters<typeof workflowApi.generate>[0]
  >,
) =>
  useMutation({
    mutationFn: workflowApi.generate,
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
