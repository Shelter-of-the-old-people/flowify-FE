import { useMutation } from "@tanstack/react-query";

import type { ShareRequest } from "../../api";
import { workflowApi } from "../../api";

import { invalidateWorkflowLists } from "./workflow-cache-utils";

export const useShareWorkflowMutation = () =>
  useMutation({
    mutationFn: ({
      workflowId,
      body,
    }: {
      workflowId: string;
      body: ShareRequest;
    }) => workflowApi.share(workflowId, body),
    onSuccess: invalidateWorkflowLists,
  });
