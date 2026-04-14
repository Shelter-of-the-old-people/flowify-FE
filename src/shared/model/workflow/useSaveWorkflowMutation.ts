import { useMutation } from "@tanstack/react-query";

import { workflowApi } from "../../api";
import { toWorkflowUpdateRequest } from "../../libs/workflow-adapter";
import type { WorkflowAdapterStoreState } from "../../libs/workflow-adapter";

import { syncWorkflowCache } from "./workflow-cache-utils";

export const useSaveWorkflowMutation = () =>
  useMutation({
    mutationFn: ({
      workflowId,
      store,
    }: {
      workflowId: string;
      store: WorkflowAdapterStoreState;
    }) => workflowApi.update(workflowId, toWorkflowUpdateRequest(store)),
    onSuccess: syncWorkflowCache,
  });
