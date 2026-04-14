import { useMutation } from "@tanstack/react-query";

import { workflowApi } from "../../api";

import { removeWorkflowCache } from "./workflow-cache-utils";

export const useDeleteWorkflowMutation = () =>
  useMutation({
    mutationFn: (workflowId: string) => workflowApi.delete(workflowId),
    onSuccess: async (_, workflowId) => {
      await removeWorkflowCache(workflowId);
    },
  });
