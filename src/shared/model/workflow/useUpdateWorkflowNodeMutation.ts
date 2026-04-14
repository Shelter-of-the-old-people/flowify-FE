import { useMutation } from "@tanstack/react-query";

import type { NodeUpdateRequest } from "../../api";
import { workflowApi } from "../../api";

import { syncWorkflowCache } from "./workflow-cache-utils";

export const useUpdateWorkflowNodeMutation = () =>
  useMutation({
    mutationFn: ({
      workflowId,
      nodeId,
      body,
    }: {
      workflowId: string;
      nodeId: string;
      body: NodeUpdateRequest;
    }) => workflowApi.updateNode(workflowId, nodeId, body),
    onSuccess: syncWorkflowCache,
  });
