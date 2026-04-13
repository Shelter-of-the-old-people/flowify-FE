import { useMutation } from "@tanstack/react-query";

import type { NodeAddRequest } from "../../api";
import { workflowApi } from "../../api";
import { type MutationPolicyOptions, toMutationMeta } from "../query-policy";

import { syncWorkflowCache } from "./workflow-cache-utils";

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
    mutationFn: ({ workflowId, body }: AddWorkflowNodeVariables) =>
      workflowApi.addNode(workflowId, body),
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
