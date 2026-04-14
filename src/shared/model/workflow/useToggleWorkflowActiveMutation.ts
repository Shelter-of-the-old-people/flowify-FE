import { useMutation } from "@tanstack/react-query";

import { workflowApi } from "../../api";

import { syncWorkflowCache } from "./workflow-cache-utils";

export const useToggleWorkflowActiveMutation = () =>
  useMutation({
    mutationFn: ({
      workflowId,
      active,
    }: {
      workflowId: string;
      active: boolean;
    }) =>
      workflowApi.update(workflowId, {
        active,
      }),
    onSuccess: syncWorkflowCache,
  });
