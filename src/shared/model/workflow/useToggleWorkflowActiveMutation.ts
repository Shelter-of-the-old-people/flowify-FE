import { useMutation } from "@tanstack/react-query";

import { workflowApi } from "../../api";
import { type MutationPolicyOptions, toMutationMeta } from "../query-policy";

import { syncWorkflowCache } from "./workflow-cache-utils";

type ToggleWorkflowActiveVariables = {
  workflowId: string;
  active: boolean;
};

export const useToggleWorkflowActiveMutation = (
  options?: MutationPolicyOptions<
    Awaited<ReturnType<typeof workflowApi.update>>,
    ToggleWorkflowActiveVariables
  >,
) =>
  useMutation({
    mutationFn: ({ workflowId, active }: ToggleWorkflowActiveVariables) =>
      workflowApi.update(workflowId, {
        active,
      }),
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
