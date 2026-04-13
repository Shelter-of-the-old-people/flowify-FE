import { useMutation } from "@tanstack/react-query";

import type { WorkflowResponse } from "../../api";
import { templateApi } from "../../api";
import { type MutationPolicyOptions, toMutationMeta } from "../query-policy";
import { syncWorkflowCache } from "../workflow";

export const useInstantiateTemplateMutation = (
  options?: MutationPolicyOptions<WorkflowResponse, string>,
) =>
  useMutation({
    mutationFn: (id: string) => templateApi.instantiate(id),
    retry: options?.retry,
    meta: toMutationMeta(options),
    onSuccess: async (workflow, templateId, onMutateResult, context) => {
      await syncWorkflowCache(workflow);
      await options?.onSuccess?.(workflow, templateId, onMutateResult, context);
    },
    onError: async (error, templateId, onMutateResult, context) => {
      await options?.onError?.(error, templateId, onMutateResult, context);
    },
  });
