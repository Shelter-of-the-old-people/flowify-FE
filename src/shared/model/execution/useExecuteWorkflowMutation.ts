import { useMutation } from "@tanstack/react-query";

import { executionApi } from "../../api";
import { executionKeys } from "../../constants";
import { queryClient } from "../../libs";

export const useExecuteWorkflowMutation = () =>
  useMutation({
    mutationFn: (workflowId: string) => executionApi.execute(workflowId),
    onSuccess: async (_, workflowId) => {
      await queryClient.invalidateQueries({
        queryKey: executionKeys.lists(workflowId),
      });
    },
  });
