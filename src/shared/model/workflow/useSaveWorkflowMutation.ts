import { useMutation } from "@tanstack/react-query";

import { workflowApi } from "../../api";
import type { WorkflowAdapterStoreState } from "../../libs/workflow-adapter";
import { toWorkflowUpdateRequest } from "../../libs/workflow-adapter";
import { type MutationPolicyOptions, toMutationMeta } from "../query-policy";

import { syncWorkflowCache } from "./workflow-cache-utils";

type SaveWorkflowVariables = {
  workflowId: string;
  store: WorkflowAdapterStoreState;
};

export const useSaveWorkflowMutation = (
  options?: MutationPolicyOptions<
    Awaited<ReturnType<typeof workflowApi.update>>,
    SaveWorkflowVariables
  >,
) =>
  useMutation({
    mutationFn: ({ workflowId, store }: SaveWorkflowVariables) =>
      workflowApi.update(workflowId, toWorkflowUpdateRequest(store)),
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
