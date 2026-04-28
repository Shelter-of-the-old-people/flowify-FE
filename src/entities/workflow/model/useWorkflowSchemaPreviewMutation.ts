import { useMutation } from "@tanstack/react-query";

import { type MutationPolicyOptions, toMutationMeta } from "@/shared/api";

import { type SchemaPreviewRequest, workflowApi } from "../api";

export const useWorkflowSchemaPreviewMutation = (
  options?: MutationPolicyOptions<
    Awaited<ReturnType<typeof workflowApi.previewSchema>>,
    SchemaPreviewRequest
  >,
) =>
  useMutation({
    mutationFn: workflowApi.previewSchema,
    retry: options?.retry,
    meta: toMutationMeta(options),
    onSuccess: async (data, variables, onMutateResult, context) => {
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: async (error, variables, onMutateResult, context) => {
      await options?.onError?.(error, variables, onMutateResult, context);
    },
  });
