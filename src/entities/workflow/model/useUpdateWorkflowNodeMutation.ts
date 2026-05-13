import { useMutation } from "@tanstack/react-query";

import { type MutationPolicyOptions, toMutationMeta } from "@/shared/api";

import { type NodeUpdateRequest, workflowApi } from "../api";

import { workflowMutationKeys } from "./mutation-keys";
import {
  getWorkflowDetailOrFallback,
  syncWorkflowCache,
} from "./workflow-cache-utils";

type UpdateWorkflowNodeVariables = {
  workflowId: string;
  nodeId: string;
  body: NodeUpdateRequest;
};

export const useUpdateWorkflowNodeMutation = (
  options?: MutationPolicyOptions<
    Awaited<ReturnType<typeof workflowApi.updateNode>>,
    UpdateWorkflowNodeVariables
  >,
) =>
  useMutation({
    mutationKey: workflowMutationKeys.nodeConfig,
    mutationFn: async ({
      workflowId,
      nodeId,
      body,
    }: UpdateWorkflowNodeVariables) => {
      const workflow = await workflowApi.updateNode(workflowId, nodeId, body);
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
