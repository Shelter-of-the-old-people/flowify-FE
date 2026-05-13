import { useMutation } from "@tanstack/react-query";

import {
  getWorkflowDetailOrFallback,
  syncWorkflowCache,
  workflowApi,
} from "@/entities/workflow";
import { type MutationPolicyOptions, toMutationMeta } from "@/shared/api";

import { type WorkflowEditorSaveState } from "./workflow-editor-adapter";
import { toWorkflowUpdateRequest } from "./workflow-editor-adapter";
import { useWorkflowStore } from "./workflowStore";

type SaveWorkflowVariables = {
  workflowId: string;
  store: WorkflowEditorSaveState;
  dirtyRevision: number;
};

export const useSaveWorkflowMutation = (
  options?: MutationPolicyOptions<
    Awaited<ReturnType<typeof workflowApi.update>>,
    SaveWorkflowVariables
  >,
) =>
  useMutation({
    mutationFn: async ({ workflowId, store }: SaveWorkflowVariables) => {
      const workflow = await workflowApi.update(
        workflowId,
        toWorkflowUpdateRequest(store),
      );
      return getWorkflowDetailOrFallback(workflowId, workflow);
    },
    retry: options?.retry,
    meta: toMutationMeta(options),
    onSuccess: async (workflow, variables, onMutateResult, context) => {
      await syncWorkflowCache(workflow);
      useWorkflowStore.getState().markCleanIfUnchanged(variables.dirtyRevision);
      await options?.onSuccess?.(workflow, variables, onMutateResult, context);
    },
    onError: async (error, variables, onMutateResult, context) => {
      await options?.onError?.(error, variables, onMutateResult, context);
    },
  });
