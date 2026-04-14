import { useMutation } from "@tanstack/react-query";

import {
  syncWorkflowCache,
  workflowApi,
} from "@/entities/workflow";
import { type MutationPolicyOptions, toMutationMeta } from "@/shared/api";

import type { WorkflowEditorStoreState } from "./workflow-editor-adapter";
import { toWorkflowUpdateRequest } from "./workflow-editor-adapter";

type SaveWorkflowVariables = {
  workflowId: string;
  store: WorkflowEditorStoreState;
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
