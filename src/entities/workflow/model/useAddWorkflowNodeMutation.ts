import { useMutation } from "@tanstack/react-query";

import { type MutationPolicyOptions, toMutationMeta } from "@/shared/api";

import { type NodeAddRequest, workflowApi } from "../api";

import { workflowMutationKeys } from "./mutation-keys";
import {
  getWorkflowDetailOrFallback,
  syncWorkflowCache,
} from "./workflow-cache-utils";

type AddWorkflowNodeVariables = {
  workflowId: string;
  body: NodeAddRequest;
};

export const useAddWorkflowNodeMutation = (
  options?: MutationPolicyOptions<
    Awaited<ReturnType<typeof workflowApi.addNode>>,
    AddWorkflowNodeVariables
  >,
) =>
  useMutation({
    mutationKey: workflowMutationKeys.structure,
    mutationFn: async ({ workflowId, body }: AddWorkflowNodeVariables) => {
      const workflow = await workflowApi.addNode(workflowId, body);
      return getWorkflowDetailOrFallback(workflowId, workflow);
    },
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
