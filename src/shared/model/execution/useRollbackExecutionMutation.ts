import { useMutation } from "@tanstack/react-query";

import { executionApi } from "../../api";
import { executionKeys } from "../../constants";
import { queryClient } from "../../libs";

export const useRollbackExecutionMutation = () =>
  useMutation({
    mutationFn: ({
      workflowId,
      executionId,
      nodeId,
    }: {
      workflowId: string;
      executionId: string;
      nodeId?: string;
    }) => executionApi.rollback(workflowId, executionId, nodeId),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: executionKeys.lists(variables.workflowId),
      });
    },
  });
