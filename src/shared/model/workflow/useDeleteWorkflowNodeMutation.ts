import { useMutation } from "@tanstack/react-query";

import { workflowApi } from "../../api";

import { syncWorkflowCache } from "./workflow-cache-utils";

export const useDeleteWorkflowNodeMutation = () =>
  useMutation({
    mutationFn: ({
      workflowId,
      nodeId,
    }: {
      workflowId: string;
      nodeId: string;
    }) => workflowApi.deleteNode(workflowId, nodeId),
    onSuccess: syncWorkflowCache,
  });
