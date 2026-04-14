import { useMutation } from "@tanstack/react-query";

import { workflowApi } from "../../api";

export const useSelectWorkflowChoiceMutation = () =>
  useMutation({
    mutationFn: ({
      workflowId,
      prevNodeId,
      selectedOptionId,
      dataType,
      context,
    }: {
      workflowId: string;
      prevNodeId: string;
      selectedOptionId: string;
      dataType: string;
      context?: Record<string, unknown>;
    }) =>
      workflowApi.selectChoice(workflowId, prevNodeId, {
        selectedOptionId,
        dataType,
        context,
      }),
  });
