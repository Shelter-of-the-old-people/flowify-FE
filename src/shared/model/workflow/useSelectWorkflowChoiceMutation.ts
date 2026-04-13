import { useMutation } from "@tanstack/react-query";

import { workflowApi } from "../../api";
import { workflowKeys } from "../../constants";
import { queryClient } from "../../libs";
import { type MutationPolicyOptions, toMutationMeta } from "../query-policy";

type SelectWorkflowChoiceVariables = {
  workflowId: string;
  prevNodeId: string;
  selectedOptionId: string;
  dataType: string;
  context?: Record<string, unknown>;
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
      selectedOptionId,
      dataType,
      context,
    }: SelectWorkflowChoiceVariables) =>
      workflowApi.selectChoice(workflowId, prevNodeId, {
        selectedOptionId,
        dataType,
        context,
      }),
    retry: options?.retry,
    meta: toMutationMeta(options),
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({
        queryKey: workflowKeys.choice(variables.workflowId, variables.prevNodeId),
      });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: async (error, variables, onMutateResult, context) => {
      await options?.onError?.(error, variables, onMutateResult, context);
    },
  });
