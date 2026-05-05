import { useMutation } from "@tanstack/react-query";

import { type MutationPolicyOptions, toMutationMeta } from "@/shared/api";

import {
  type NodePreviewResponse,
  type PreviewWorkflowNodeCommand,
  workflowApi,
} from "../api";

export const useWorkflowNodePreviewMutation = (
  options?: MutationPolicyOptions<
    NodePreviewResponse,
    PreviewWorkflowNodeCommand
  >,
) =>
  useMutation({
    mutationFn: ({
      workflowId,
      nodeId,
      limit,
      includeContent,
    }: PreviewWorkflowNodeCommand) =>
      workflowApi.previewNode(workflowId, nodeId, { limit, includeContent }),
    retry: options?.retry,
    meta: toMutationMeta(options),
    onSuccess: async (data, variables, onMutateResult, context) => {
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: async (error, variables, onMutateResult, context) => {
      await options?.onError?.(error, variables, onMutateResult, context);
    },
  });
