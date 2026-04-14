import { useMutation } from "@tanstack/react-query";

import type { NodeAddRequest } from "../../api";
import { workflowApi } from "../../api";

import { syncWorkflowCache } from "./workflow-cache-utils";

export const useAddWorkflowNodeMutation = () =>
  useMutation({
    mutationFn: ({
      workflowId,
      body,
    }: {
      workflowId: string;
      body: NodeAddRequest;
    }) => workflowApi.addNode(workflowId, body),
    onSuccess: syncWorkflowCache,
  });
