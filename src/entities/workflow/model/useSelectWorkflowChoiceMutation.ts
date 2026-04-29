import { useMutation } from "@tanstack/react-query";

import { type MutationPolicyOptions, toMutationMeta } from "@/shared/api";
import { queryClient } from "@/shared/libs";

import { type SelectWorkflowChoiceCommand, workflowApi } from "../api";

import { workflowKeys } from "./query-keys";

type SelectWorkflowChoiceVariables = SelectWorkflowChoiceCommand & {
  workflowId: string;
  prevNodeId: string;
};

export const useSelectWorkflowChoiceMutation = (
  options?: MutationPolicyOptions<
    Awaited<ReturnType<typeof workflowApi.selectChoice>>,
    SelectWorkflowChoiceVariables
  >,
) =>
  useMutation({
    mutationFn: ({
      workflowId,
      prevNodeId,
      optionId,
      dataType,
      context,
    }: SelectWorkflowChoiceVariables) =>
      workflowApi.selectChoice(workflowId, prevNodeId, {
        optionId,
        dataType,
        context,
      }),
    retry: options?.retry,
    meta: toMutationMeta(options),
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({
        queryKey: workflowKeys.choice(
          variables.workflowId,
          variables.prevNodeId,
        ),
      });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: async (error, variables, onMutateResult, context) => {
      await options?.onError?.(error, variables, onMutateResult, context);
    },
  });
